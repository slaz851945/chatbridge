import { describe, expect, it } from "vitest";
import { ExportFlow } from "@application/export/ExportFlow.js";
import { ZipBundle } from "@application/bundle/ZipBundle.js";
import type {
  ChatSourcePort,
  ExtractOptions,
  ExtractProgress,
} from "@application/ports/ChatSourcePort.js";
import type { Chat } from "@domain/models/Chat.js";

const sampleChat: Chat = {
  source: {
    platform: "deepseek",
    url: "https://chat.deepseek.com/a/chat/s/x",
    title: "Flow Test",
  },
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

function makeAdapter(onCall?: (opts?: ExtractOptions) => void): ChatSourcePort {
  return {
    isAvailable: (): boolean => true,
    extract: (options?: ExtractOptions): Promise<Chat> => {
      onCall?.(options);
      options?.onProgress?.({
        phase: "done",
        messagesFound: 1,
        scrollCount: 0,
      } satisfies ExtractProgress);
      return Promise.resolve(sampleChat);
    },
  };
}

describe("ExportFlow", () => {
  it("produit un résultat complet", async () => {
    const flow = new ExportFlow();
    const result = await flow.run({
      chatSource: makeAdapter(),
      bundle: new ZipBundle(),
      now: () => new Date("2026-09-28T14:00:00.000Z"),
    });
    expect(result.fileName).toBe("chatbridge-flow-test-2026-09-28.zip");
    expect(result.messageCount).toBe(1);
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.bytes).toBeInstanceOf(Uint8Array);
  });

  it("appelle onProgress si fourni", async () => {
    const flow = new ExportFlow();
    const phases: string[] = [];
    await flow.run({
      chatSource: makeAdapter(),
      bundle: new ZipBundle(),
      onProgress: (p) => {
        phases.push(p.phase);
      },
    });
    expect(phases).toContain("done");
  });

  it("fonctionne sans onProgress", async () => {
    const flow = new ExportFlow();
    let capturedOptions: ExtractOptions | undefined;
    const adapter = makeAdapter((opts) => {
      capturedOptions = opts;
    });
    await flow.run({ chatSource: adapter, bundle: new ZipBundle() });
    expect(capturedOptions).toEqual({});
  });

  it("utilise new Date() si now absent", async () => {
    const flow = new ExportFlow();
    const before = Date.now();
    const result = await flow.run({
      chatSource: makeAdapter(),
      bundle: new ZipBundle(),
    });
    const after = Date.now();
    const exportedAt = new Date(result.envelope.exported_at).getTime();
    expect(exportedAt).toBeGreaterThanOrEqual(before);
    expect(exportedAt).toBeLessThanOrEqual(after);
  });
});