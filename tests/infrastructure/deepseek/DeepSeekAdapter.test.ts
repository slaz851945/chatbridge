// @vitest-environment jsdom
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearCapture,
  installDeepSeekApiInterceptor,
} from "@infrastructure/deepseek/apiInterceptor.js";
import type { Clock } from "@infrastructure/deepseek/clock.js";
import { DeepSeekAdapter } from "@infrastructure/deepseek/DeepSeekAdapter.js";

const instantClock: Clock = { sleep: () => Promise.resolve() };

function makeWindow(html: string, url: string): Window {
  const dom = new JSDOM(
    `<!DOCTYPE html><html><head><title>Test</title></head><body>${html}</body></html>`,
    { url },
  );
  return dom.window as unknown as Window;
}

function makeFetchResponse(payload: unknown): Response {
  const obj = {
    json: (): Promise<unknown> => Promise.resolve(payload),
    clone(): object {
      return this;
    },
  };
  return obj as unknown as Response;
}

describe("DeepSeekAdapter", () => {
  beforeEach(() => {
    clearCapture();
  });

  afterEach(() => {
    clearCapture();
  });

  it("isAvailable() = true sur chat.deepseek.com", () => {
    const w = makeWindow("", "https://chat.deepseek.com/a/chat/s/xyz");
    const a = new DeepSeekAdapter({ window: w, document: w.document, clock: instantClock });
    expect(a.isAvailable()).toBe(true);
  });

  it("isAvailable() = false hors DeepSeek", () => {
    const w = makeWindow("", "https://example.com/");
    const a = new DeepSeekAdapter({ window: w, document: w.document, clock: instantClock });
    expect(a.isAvailable()).toBe(false);
  });

  it("extract() sans scroll container — extraction statique", async () => {
    const w = makeWindow(
      '<div class="ds-message"><div class="ds-markdown ds-assistant-message-main-content">Bonjour</div></div>',
      "https://chat.deepseek.com/a/chat/s/xyz",
    );
    const a = new DeepSeekAdapter({ window: w, document: w.document, clock: instantClock });
    const chat = await a.extract({ apiWaitMs: 0 });
    expect(chat.source.platform).toBe("deepseek");
    expect(chat.messages).toHaveLength(1);
    expect(chat.messages[0]?.content).toBe("Bonjour");
  });

  it("extract() avec scroll container — passe par VirtualListExtractor", async () => {
    const w = makeWindow(
      `
        <div class="ds-virtual-list">
          <div class="ds-message"><div class="ds-markdown ds-assistant-message-main-content">X</div></div>
        </div>
      `,
      "https://chat.deepseek.com/a/chat/s/xyz",
    );
    const a = new DeepSeekAdapter({ window: w, document: w.document, clock: instantClock });
    const chat = await a.extract({ apiWaitMs: 0, maxScrolls: 2, scrollDelayMs: 0 });
    expect(chat.messages.length).toBeGreaterThanOrEqual(1);
  });

  it("onProgress est appelé", async () => {
    const w = makeWindow(
      '<div class="ds-message"><div class="ds-markdown ds-assistant-message-main-content">Q</div></div>',
      "https://chat.deepseek.com/a/chat/s/xyz",
    );
    const a = new DeepSeekAdapter({ window: w, document: w.document, clock: instantClock });
    const phases: string[] = [];
    await a.extract({
      apiWaitMs: 0,
      onProgress: (p) => {
        phases.push(p.phase);
      },
    });
    expect(phases).toContain("done");
  });

  it("apiWaitMs > 0 émet la phase extracting avant le fallback DOM", async () => {
    const w = makeWindow(
      '<div class="ds-message"><div class="ds-markdown ds-assistant-message-main-content">Z</div></div>',
      "https://chat.deepseek.com/a/chat/s/xyz",
    );
    const a = new DeepSeekAdapter({ window: w, document: w.document, clock: instantClock });
    const phases: string[] = [];
    await a.extract({
      apiWaitMs: 50,
      onProgress: (p) => {
        phases.push(p.phase);
      },
    });
    expect(phases).toContain("extracting");
    expect(phases).toContain("done");
  });

  it("extract() avec selectors personnalisés (branche deps.selectors)", async () => {
    const w = makeWindow(
      '<div class="custom-msg"><span class="custom-content">Custom</span></div>',
      "https://chat.deepseek.com/a/chat/s/xyz",
    );
    const a = new DeepSeekAdapter({
      window: w,
      document: w.document,
      clock: instantClock,
      selectors: {
        messageBlock: [".custom-msg"],
        assistantContent: [".custom-content"],
        userTextContent: [".fbb737a4"],
        userAttachment: [".eafda4ae"],
        attachmentName: [".e70accd6"],
        thinkingBlock: ["._74c0879"],
        scrollContainer: [".ds-virtual-list"],
      },
    });
    const chat = await a.extract({ apiWaitMs: 0 });
    expect(chat.messages).toHaveLength(1);
    expect(chat.messages[0]?.content).toBe("Custom");
  });

  it("extract() utilise la capture API si disponible", async () => {
    // Seed : on installe l'intercepteur et on simule une réponse fetch
    // contenant un tableau de 6 messages pour amorcer la capture.
    const payload = {
      data: {
        messages: Array.from({ length: 6 }, (_, i) => ({
          role: i % 2 === 0 ? "user" : "assistant",
          content: `msg-${String(i)}`,
        })),
      },
    };
    // On installe le patcher sur le window jsdom global
    if (typeof window !== "undefined") {
      window.fetch = (): Promise<Response> => Promise.resolve(makeFetchResponse(payload));
      installDeepSeekApiInterceptor();
      await window.fetch("https://chat.deepseek.com/api/history");
      await new Promise<void>((r) => {
        setTimeout(r, 30);
      });
    }

    const w = makeWindow("", "https://chat.deepseek.com/a/chat/s/xyz");
    const a = new DeepSeekAdapter({ window: w, document: w.document, clock: instantClock });
    const chat = await a.extract({ apiWaitMs: 0 });
    expect(chat.messages.length).toBeGreaterThanOrEqual(6);
    expect(chat.messages[0]?.content).toBe("msg-0");
  });
});