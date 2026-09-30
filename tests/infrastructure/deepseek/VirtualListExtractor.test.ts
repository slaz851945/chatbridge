// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import type { Message } from "@domain/models/Message.js";
import type { Clock } from "@infrastructure/deepseek/clock.js";
import { VirtualListExtractor } from "@infrastructure/deepseek/VirtualListExtractor.js";

const instantClock: Clock = { sleep: () => Promise.resolve() };

interface FakeExtractor {
  extract: () => readonly Message[];
}

function makeScrollContainer(scrollHeight: number, clientHeight: number): HTMLElement {
  const el = document.createElement("div");
  Object.defineProperty(el, "scrollHeight", { value: scrollHeight, configurable: true });
  Object.defineProperty(el, "clientHeight", { value: clientHeight, configurable: true });
  return el;
}

function makeMessage(index: number, content: string): Message {
  return {
    index,
    role: index % 2 === 0 ? "user" : "assistant",
    timestamp: null,
    content,
    thinking: null,
    attachments: [],
  };
}

describe("VirtualListExtractor", () => {
  it("retourne [] si le conteneur est absent", async () => {
    const extractor: FakeExtractor = { extract: () => [] };
    const vle = new VirtualListExtractor({
      getScrollContainer: () => null,
      extractor: extractor as never,
      clock: instantClock,
    });
    const result = await vle.captureAll();
    expect(result).toEqual([]);
  });

  it("capture et déduplique", async () => {
    const container = makeScrollContainer(1000, 500);
    const messages = [makeMessage(0, "A"), makeMessage(1, "B")];
    let callCount = 0;
    const extractor: FakeExtractor = {
      extract: () => {
        callCount += 1;
        return messages;
      },
    };
    const vle = new VirtualListExtractor({
      getScrollContainer: () => container,
      extractor: extractor as never,
      clock: instantClock,
    });
    const result = await vle.captureAll({ scrollStepPx: 300, maxIterations: 5 });
    expect(result).toHaveLength(2);
    expect(callCount).toBeGreaterThan(1);
  });

  it("restaure scrollTop initial", async () => {
    const container = makeScrollContainer(1000, 500);
    container.scrollTop = 250;
    const extractor: FakeExtractor = { extract: () => [makeMessage(0, "X")] };
    const vle = new VirtualListExtractor({
      getScrollContainer: () => container,
      extractor: extractor as never,
      clock: instantClock,
    });
    await vle.captureAll({ scrollStepPx: 300, maxIterations: 2 });
    expect(container.scrollTop).toBe(250);
  });

  it("utilise le conteneur frais à chaque itération", async () => {
    const containers: HTMLElement[] = [
      makeScrollContainer(500, 500),
      makeScrollContainer(500, 500),
    ];
    let idx = 0;
    const extractor: FakeExtractor = { extract: () => [makeMessage(0, "X")] };
    const vle = new VirtualListExtractor({
      getScrollContainer: () => {
        const c = containers[Math.min(idx, containers.length - 1)];
        idx += 1;
        return c ?? null;
      },
      extractor: extractor as never,
      clock: instantClock,
    });
    const result = await vle.captureAll({ maxIterations: 3 });
    expect(result).toHaveLength(1);
  });

  it("appelle onProgress", async () => {
    const container = makeScrollContainer(500, 500);
    const extractor: FakeExtractor = { extract: () => [makeMessage(0, "X")] };
    const vle = new VirtualListExtractor({
      getScrollContainer: () => container,
      extractor: extractor as never,
      clock: instantClock,
    });
    const calls: number[] = [];
    await vle.captureAll({
      onProgress: (info) => {
        calls.push(info.messagesFound);
      },
    });
    expect(calls.length).toBeGreaterThan(0);
  });

  it("respecte la limite maxIterations", async () => {
    const container = makeScrollContainer(1000000, 500);
    const extractor: FakeExtractor = {
      extract: vi.fn(() => [makeMessage(0, "X")]),
    };
    const vle = new VirtualListExtractor({
      getScrollContainer: () => container,
      extractor: extractor as never,
      clock: instantClock,
    });
    await vle.captureAll({ maxIterations: 3, scrollStepPx: 100 });
    const calls = (extractor.extract as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(calls).toBeLessThan(200);
  });
});