import { ChunkStrategy, type Chunk } from "@application/chunking/ChunkStrategy.js";
import type {
  ImportOptions,
  ImportPort,
} from "@application/ports/ImportPort.js";
import type { Chat } from "@domain/models/Chat.js";
import type { Clock } from "./clock.js";
import {
  DEFAULT_DEEPSEEK_SELECTORS,
  type DeepSeekSelectors,
} from "./selectors.js";

export interface DeepSeekImporterDeps {
  readonly window: Window;
  readonly document: Document;
  readonly clock: Clock;
  readonly selectors?: DeepSeekSelectors;
}

const INPUT_SELECTORS: readonly string[] = [
  "textarea",
  "[contenteditable='true']",
  "div[role='textbox']",
];

const SEND_BUTTON_SELECTORS: readonly string[] = [
  "button[type='submit']",
  "button[aria-label*='Send' i]",
  "button[aria-label*='Envoyer' i]",
  "button[data-testid*='send' i]",
];

const DEFAULT_RESPONSE_TIMEOUT_MS = 300_000;
const MAX_RETRIES_PER_CHUNK = 3;
const POLL_INTERVAL_MS = 500;
const INPUT_READY_MAX_ITERATIONS = 60;
const INPUT_CLEARED_MAX_ITERATIONS = 40;

/** Nombre de secondes de stabilité du texte pour considérer la réponse finie. */
const STABLE_MS = 4_000;

// Pacing anti rate-limit — relaxé
const DELAY_BETWEEN_CHUNKS_MS = 2_000;
const PAUSE_EVERY_N_CHUNKS = 10;
const PAUSE_DURATION_MS = 15_000;
const LONG_PAUSE_EVERY_N_CHUNKS = 30;
const LONG_PAUSE_DURATION_MS = 45_000;

class ConfigError extends Error {}

export class DeepSeekImporter implements ImportPort {
  private readonly win: Window;
  private readonly doc: Document;
  private readonly clock: Clock;
  private readonly selectors: DeepSeekSelectors;

  constructor(deps: DeepSeekImporterDeps) {
    this.win = deps.window;
    this.doc = deps.document;
    this.clock = deps.clock;
    this.selectors = deps.selectors ?? DEFAULT_DEEPSEEK_SELECTORS;
  }

  isAvailable(): boolean {
    return this.win.location.href.includes("chat.deepseek.com");
  }

  async importChat(chat: Chat, options?: ImportOptions): Promise<void> {
    const chunks = ChunkStrategy.chunk(chat.messages, {
      ...(options?.chunkSize !== undefined && { maxChars: options.chunkSize }),
      ...(options?.compact === true && { compact: true }),
    });

    if (chunks.length === 0) return;

    const timeout = options?.responseTimeoutMs ?? DEFAULT_RESPONSE_TIMEOUT_MS;
    const total = chunks.length;

    console.info(
      `[ChatBridge] Import démarré : ${String(total)} chunks, compact=${String(options?.compact ?? false)}`,
    );

    for (let i = 0; i < total; i += 1) {
      const chunk = chunks[i];
      if (chunk === undefined) continue;

      options?.onProgress?.({
        phase: "sending",
        chunkIndex: i,
        chunkCount: total,
        messageCount: chat.messages.length,
      });

      const ok = await this.sendChunkWithRetries(
        chunk,
        timeout,
        options,
        i,
        total,
      );
      if (!ok) {
        throw new Error(
          `[ChatBridge] Import interrompu au chunk ${String(i + 1)}/${String(total)} après ${String(MAX_RETRIES_PER_CHUNK)} tentatives.`,
        );
      }

      if (i < total - 1) {
        const nextIndex = i + 1;
        if (nextIndex % LONG_PAUSE_EVERY_N_CHUNKS === 0) {
          options?.onProgress?.({
            phase: "pausing",
            chunkIndex: nextIndex,
            chunkCount: total,
            messageCount: chat.messages.length,
          });
          console.info(`[ChatBridge] pause longue ${String(LONG_PAUSE_DURATION_MS / 1000)}s`);
          await this.clock.sleep(LONG_PAUSE_DURATION_MS);
        } else if (nextIndex % PAUSE_EVERY_N_CHUNKS === 0) {
          options?.onProgress?.({
            phase: "pausing",
            chunkIndex: nextIndex,
            chunkCount: total,
            messageCount: chat.messages.length,
          });
          console.info(`[ChatBridge] pause ${String(PAUSE_DURATION_MS / 1000)}s`);
          await this.clock.sleep(PAUSE_DURATION_MS);
        } else {
          await this.clock.sleep(DELAY_BETWEEN_CHUNKS_MS);
        }
      }
    }
  }

  private async sendChunkWithRetries(
    chunk: Chunk,
    timeout: number,
    options: ImportOptions | undefined,
    chunkIndex: number,
    total: number,
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= MAX_RETRIES_PER_CHUNK; attempt += 1) {
      try {
        const ok = await this.sendChunkOnce(
          chunk,
          timeout,
          options,
          chunkIndex,
          total,
          attempt,
        );
        if (ok) return true;
      } catch (err) {
        if (err instanceof ConfigError) throw err;
        if (attempt === MAX_RETRIES_PER_CHUNK) {
          console.error(`[ChatBridge] chunk ${String(chunkIndex + 1)} erreur finale:`, err);
          return false;
        }
        console.warn(
          `[ChatBridge] chunk ${String(chunkIndex + 1)} tentative ${String(attempt)} échouée, retry dans 15 s`,
        );
        await this.clock.sleep(15_000);
      }
    }
    return false;
  }

  private async sendChunkOnce(
    chunk: Chunk,
    timeout: number,
    options: ImportOptions | undefined,
    chunkIndex: number,
    total: number,
    attempt: number,
  ): Promise<boolean> {
    await this.waitForInputReady(INPUT_READY_MAX_ITERATIONS);

    const input = this.findInput();
    if (input === null) {
      throw new ConfigError("[ChatBridge] champ de saisie DeepSeek introuvable");
    }

    this.setInputValue(input, chunk.text);
    await this.clock.sleep(300);
    this.pressEnter(input);

    options?.onProgress?.({
      phase: "waiting",
      chunkIndex: chunkIndex + 1,
      chunkCount: total,
      messageCount: 0,
    });

    console.info(
      `[ChatBridge] chunk ${String(chunkIndex + 1)}/${String(total)} tentative ${String(attempt)} envoyé`,
    );

    const ok = await this.waitForResponse(timeout);
    if (!ok) {
      console.warn(
        `[ChatBridge] timeout chunk ${String(chunkIndex + 1)} tentative ${String(attempt)}`,
      );
      this.clearInput(input);
      return false;
    }
    console.info(
      `[ChatBridge] chunk ${String(chunkIndex + 1)}/${String(total)} — réponse terminée`,
    );
    return true;
  }

  /**
   * Attend la fin de génération en échantillonnant la LONGUEUR DU TEXTE
   * des 3 derniers messages. Indépendant du DOM virtualisé, des mutations,
   * et du scroll.
   */
  private async waitForResponse(timeoutMs: number): Promise<boolean> {
    if (timeoutMs <= 0) return true;

    const start = Date.now();

    // 1) Attendre que l'input se vide (message effectivement envoyé)
    await this.waitForInputCleared(INPUT_CLEARED_MAX_ITERATIONS);

    // 2) Échantillonner la signature (longueurs des 3 derniers messages)
    let lastSignature = "";
    let stableSince = Date.now();
    let signatureStarted = false;

    while (Date.now() - start < timeoutMs) {
      await this.clock.sleep(POLL_INTERVAL_MS);

      const nodes = this.doc.querySelectorAll(
        this.selectors.messageBlock.join(","),
      );
      const tail = Array.from(nodes).slice(-3);
      // const signature = tail
      //   .map((n) => String((n.textContent ?? "").length))
      //   .join("|");
      const signature = tail
        .map((n) => String(n.textContent.length))
        .join("|");  

      // Signature encore vide : aucun message rendu, on continue
      if (signature === "" || tail.length === 0) {
        continue;
      }

      // La réponse a commencé : au moins un message avec du contenu
      // if (!signatureStarted && tail.some((n) => (n.textContent ?? "").length > 0)) {
      if (!signatureStarted && tail.some((n) => n.textContent.length > 0)) {  
        signatureStarted = true;
        lastSignature = signature;
        stableSince = Date.now();
        continue;
      }

      if (signature !== lastSignature) {
        lastSignature = signature;
        stableSince = Date.now();
        continue;
      }

      // Signature stable pendant STABLE_MS → terminé
      if (signatureStarted && Date.now() - stableSince >= STABLE_MS) {
        const elapsed = Math.round((Date.now() - start) / 1000);
        console.info(
          `[ChatBridge] fin détectée après ${String(elapsed)}s (signature: ${signature})`,
        );
        return true;
      }
    }

    console.warn(
      `[ChatBridge] timeout dur atteint (${String(Math.round(timeoutMs / 1000))}s)`,
    );
    return false;
  }

  private async waitForInputCleared(maxIterations: number): Promise<void> {
    for (let i = 0; i < maxIterations; i += 1) {
      const input = this.findInput();
      if (input !== null && this.isInputEmpty(input)) {
        return;
      }
      await this.clock.sleep(POLL_INTERVAL_MS);
    }
  }

  private async waitForInputReady(maxIterations: number): Promise<void> {
    for (let i = 0; i < maxIterations; i += 1) {
      const input = this.findInput();
      if (input !== null && this.isInputEmpty(input)) return;
      await this.clock.sleep(POLL_INTERVAL_MS);
    }
  }

  private isInputEmpty(input: HTMLElement): boolean {
    if (input.tagName === "TEXTAREA") {
      return (input as HTMLTextAreaElement).value.trim() === "";
    }
    return input.textContent.trim() === "";
  }

  private clearInput(input: HTMLElement): void {
    if (input.tagName === "TEXTAREA") {
      const ta = input as HTMLTextAreaElement;
      const proto = Object.getPrototypeOf(ta) as object;
      const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const setter = descriptor?.set;
      if (typeof setter === "function") setter.call(ta, "");
      else ta.value = "";
      ta.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    input.textContent = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  private findInput(): HTMLElement | null {
    for (const sel of INPUT_SELECTORS) {
      const el = this.doc.querySelector(sel);
      if (el !== null && el.nodeType === 1) {
        return el as HTMLElement;
      }
    }
    return null;
  }

  private setInputValue(el: HTMLElement, value: string): void {
    if (el.tagName === "TEXTAREA") {
      const ta = el as HTMLTextAreaElement;
      const proto = Object.getPrototypeOf(ta) as object;
      const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const setter = descriptor?.set;
      if (typeof setter === "function") setter.call(ta, value);
      else ta.value = value;
      ta.dispatchEvent(new Event("input", { bubbles: true }));
      ta.focus();
      return;
    }
    el.textContent = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.focus();
  }

  private pressEnter(el: HTMLElement): void {
    const opts: KeyboardEventInit = {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
    };
    el.dispatchEvent(new KeyboardEvent("keydown", opts));
    el.dispatchEvent(new KeyboardEvent("keypress", opts));
    el.dispatchEvent(new KeyboardEvent("keyup", opts));

    for (const sel of SEND_BUTTON_SELECTORS) {
      const btn = this.doc.querySelector(sel);
      if (
        btn !== null &&
        btn.tagName === "BUTTON" &&
        !(btn as HTMLButtonElement).disabled
      ) {
        (btn as HTMLButtonElement).click();
        return;
      }
    }
  }
}