import type {
  ChatSourcePort,
  ExtractOptions,
} from "@application/ports/ChatSourcePort.js";
import type { Chat } from "@domain/models/Chat.js";
import type { Message } from "@domain/models/Message.js";
import { getCapture, waitForCapture } from "./apiInterceptor.js";
import type { Clock } from "./clock.js";
import { DeepSeekMessageExtractor } from "./DeepSeekMessageExtractor.js";
import { VirtualListExtractor } from "./VirtualListExtractor.js";
import { queryFirst } from "./domUtils.js";
import {
  DEFAULT_DEEPSEEK_SELECTORS,
  type DeepSeekSelectors,
} from "./selectors.js";

export interface DeepSeekAdapterDeps {
  readonly window: Window;
  readonly document: Document;
  readonly clock: Clock;
  readonly selectors?: DeepSeekSelectors;
}

const DEFAULT_API_WAIT_MS = 2500;

export class DeepSeekAdapter implements ChatSourcePort {
  private readonly window: Window;
  private readonly document: Document;
  private readonly clock: Clock;
  private readonly selectors: DeepSeekSelectors;

  constructor(deps: DeepSeekAdapterDeps) {
    this.window = deps.window;
    this.document = deps.document;
    this.clock = deps.clock;
    this.selectors = deps.selectors ?? DEFAULT_DEEPSEEK_SELECTORS;
  }

  isAvailable(): boolean {
    return this.window.location.href.includes("chat.deepseek.com");
  }

  async extract(options?: ExtractOptions): Promise<Chat> {
    // Stratégie 1 — interception API (rapide, complète)
    const apiMessages = await this.tryApiExtraction(options);
    if (apiMessages !== null && apiMessages.length > 0) {
      options?.onProgress?.({
        phase: "done",
        messagesFound: apiMessages.length,
        scrollCount: 0,
        scrollPercent: 100,
      });
      return this.buildChat(apiMessages);
    }

    // Stratégie 2 — fallback scroll DOM
    console.info(
      "[ChatBridge] pas de capture API — bascule sur extraction DOM",
    );
    const messages = await this.domExtraction(options);
    options?.onProgress?.({
      phase: "done",
      messagesFound: messages.length,
      scrollCount: 0,
      scrollPercent: 100,
    });
    return this.buildChat(messages);
  }

  private buildChat(messages: readonly Message[]): Chat {
    return {
      source: {
        platform: "deepseek",
        url: this.window.location.href,
        title: this.document.title,
      },
      messages,
    };
  }

  private async tryApiExtraction(
    options?: ExtractOptions,
  ): Promise<readonly Message[] | null> {
    let cap = getCapture();
    if (cap === null) {
      const waitMs = options?.apiWaitMs ?? DEFAULT_API_WAIT_MS;
      if (waitMs > 0) {
        options?.onProgress?.({
          phase: "extracting",
          messagesFound: 0,
          scrollCount: 0,
          scrollPercent: 0,
        });
      }
      cap = await waitForCapture(waitMs);
    }
    if (cap === null) {
      return null;
    }
    return cap.messages.map((m, i) => ({
      index: i,
      role: m.role,
      timestamp: m.timestamp,
      content: m.content,
      thinking: m.thinking,
      attachments: [],
    }));
  }

  private async domExtraction(
    options?: ExtractOptions,
  ): Promise<readonly Message[]> {
    const extractor = new DeepSeekMessageExtractor({
      root: this.document,
      selectors: this.selectors,
    });
    const getScrollContainer = (): HTMLElement | null => {
      const el = queryFirst(this.document, this.selectors.scrollContainer);
      return el instanceof HTMLElement ? el : null;
    };
    const firstContainer = getScrollContainer();
    if (firstContainer === null) {
      return extractor.extract();
    }
    const vle = new VirtualListExtractor({
      getScrollContainer,
      extractor,
      clock: this.clock,
    });
    return vle.captureAll({
      ...(options?.scrollDelayMs !== undefined && {
        scrollDelayMs: options.scrollDelayMs,
      }),
      ...(options?.maxScrolls !== undefined && {
        maxIterations: options.maxScrolls,
      }),
      onProgress: (info) => {
        const pct =
          info.scrollHeight > 0
            ? Math.min(
                100,
                Math.round((info.scrollTop / info.scrollHeight) * 100),
              )
            : 0;
        options?.onProgress?.({
          phase: "scrolling",
          messagesFound: info.messagesFound,
          scrollCount: info.iteration,
          scrollPercent: pct,
        });
      },
    });
  }
}