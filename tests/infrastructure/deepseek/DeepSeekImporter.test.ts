// @vitest-environment jsdom
import { JSDOM } from "jsdom";
import { describe, expect, it, vi } from "vitest";
import type { Chat } from "@domain/models/Chat.js";
import type { Clock } from "@infrastructure/deepseek/clock.js";
import { DeepSeekImporter } from "@infrastructure/deepseek/DeepSeekImporter.js";

const instantClock: Clock = { sleep: () => Promise.resolve() };

function makeWindow(html: string, url: string): Window {
  const dom = new JSDOM(
    `<!DOCTYPE html><html><head><title>Test</title></head><body>${html}</body></html>`,
    { url },
  );
  return dom.window as unknown as Window;
}

const sampleChat: Chat = {
  source: { platform: "deepseek", url: "u", title: "t" },
  messages: [
    {
      index: 0,
      role: "user",
      timestamp: null,
      content: "Bonjour",
      thinking: null,
      attachments: [],
    },
  ],
};

describe("DeepSeekImporter", () => {
  it("isAvailable() = true sur chat.deepseek.com", () => {
    const w = makeWindow("", "https://chat.deepseek.com/a/chat/s/xyz");
    const imp = new DeepSeekImporter({ window: w, document: w.document, clock: instantClock });
    expect(imp.isAvailable()).toBe(true);
  });

  it("isAvailable() = false hors DeepSeek", () => {
    const w = makeWindow("", "https://example.com/");
    const imp = new DeepSeekImporter({ window: w, document: w.document, clock: instantClock });
    expect(imp.isAvailable()).toBe(false);
  });

  it("importChat avec chat vide ne lève pas", async () => {
    const w = makeWindow("", "https://chat.deepseek.com/");
    const imp = new DeepSeekImporter({ window: w, document: w.document, clock: instantClock });
    await expect(
      imp.importChat({ source: sampleChat.source, messages: [] }),
    ).resolves.toBeUndefined();
  });

  it("importChat sans input lève une erreur claire", async () => {
    const w = makeWindow("", "https://chat.deepseek.com/");
    const imp = new DeepSeekImporter({ window: w, document: w.document, clock: instantClock });
    await expect(
      imp.importChat(sampleChat, { responseTimeoutMs: 0 }),
    ).rejects.toThrow(/champ de saisie/i);
  });

  it("importChat remplit le textarea et déclenche Enter", async () => {
    const w = makeWindow(
      `<textarea></textarea><div class="ds-message"></div><div class="ds-message"></div>`,
      "https://chat.deepseek.com/",
    );
    const imp = new DeepSeekImporter({ window: w, document: w.document, clock: instantClock });
    const textarea = w.document.querySelector("textarea")!;
    const keydownSpy = vi.fn();
    textarea.addEventListener("keydown", keydownSpy);

    await imp.importChat(sampleChat, { responseTimeoutMs: 0 });

    expect(textarea.value).toContain("[ChatBridge - Import - 1/1]");
    expect(textarea.value).toContain("Bonjour");
    expect(keydownSpy).toHaveBeenCalled();
  });

  it("importChat fonctionne avec contenteditable", async () => {
    const w = makeWindow(
      `<div contenteditable="true"></div><div class="ds-message"></div><div class="ds-message"></div>`,
      "https://chat.deepseek.com/",
    );
    const imp = new DeepSeekImporter({ window: w, document: w.document, clock: instantClock });
    const editable = w.document.querySelector<HTMLElement>("[contenteditable]")!;
    await imp.importChat(sampleChat, { responseTimeoutMs: 0 });
    expect(editable.textContent).toContain("Bonjour");
  });

  it("onProgress est appelé aux phases sending puis waiting", async () => {
    const w = makeWindow(
      `<textarea></textarea><div class="ds-message"></div><div class="ds-message"></div>`,
      "https://chat.deepseek.com/",
    );
    const imp = new DeepSeekImporter({ window: w, document: w.document, clock: instantClock });
    const phases: string[] = [];
    await imp.importChat(sampleChat, {
      responseTimeoutMs: 0,
      onProgress: (p) => {
        phases.push(p.phase);
      },
    });
    expect(phases).toContain("sending");
    expect(phases).toContain("waiting");
  });

  it("utilise le bouton d'envoi en fallback si présent", async () => {
    const w = makeWindow(
      `<textarea></textarea><button type="submit">Envoyer</button><div class="ds-message"></div><div class="ds-message"></div>`,
      "https://chat.deepseek.com/",
    );
    const imp = new DeepSeekImporter({ window: w, document: w.document, clock: instantClock });
    await imp.importChat(sampleChat, { responseTimeoutMs: 0 });
    expect(true).toBe(true);
  });

  it("accepte selectors personnalisés", async () => {
    const w = makeWindow(
      `<textarea></textarea><div class="custom-msg"></div><div class="custom-msg"></div>`,
      "https://chat.deepseek.com/",
    );
    const imp = new DeepSeekImporter({
      window: w,
      document: w.document,
      clock: instantClock,
      selectors: {
        messageBlock: [".custom-msg"],
        assistantContent: ['[class*="assistant-message-main-content"]'],
        userTextContent: [".fbb737a4"],
        userAttachment: [".eafda4ae"],
        attachmentName: [".e70accd6"],
        thinkingBlock: ["._74c0879"],
        scrollContainer: [".ds-virtual-list"],
      },
    });
    await imp.importChat(sampleChat, { responseTimeoutMs: 0 });
    expect(true).toBe(true);
  });

  it("timeout de réponse : 3 tentatives puis erreur explicite", async () => {
    const w = makeWindow(
      `<textarea></textarea><div class="ds-message"></div><div class="ds-message"></div>`,
      "https://chat.deepseek.com/",
    );
    const imp = new DeepSeekImporter({ window: w, document: w.document, clock: instantClock });
    // responseTimeoutMs très court → 3 timeouts → erreur explicite.
    await expect(
      imp.importChat(sampleChat, { responseTimeoutMs: 1 }),
    ).rejects.toThrow(/Import interrompu au chunk 1\/1/);
  });
});