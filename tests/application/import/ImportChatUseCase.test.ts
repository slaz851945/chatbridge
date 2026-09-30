import { describe, expect, it } from "vitest";
import { ImportChatUseCase } from "@application/import/ImportChatUseCase.js";
import type { ImportOptions, ImportPort } from "@application/ports/ImportPort.js";
import type { Chat } from "@domain/models/Chat.js";
import { JsonSerializer } from "@infrastructure/serializers/JsonSerializer.js";

const sampleEnvelope = {
  chatbridge_version: "0.1.0",
  exported_at: "2026-09-29T00:00:00Z",
  source: { platform: "deepseek" as const, url: "u", title: "t" },
  sha256: "a".repeat(64),
  messages: [
    {
      index: 0,
      role: "user" as const,
      timestamp: null,
      content: "Bonjour",
      thinking: null,
      attachments: [],
    },
    {
      index: 1,
      role: "assistant" as const,
      timestamp: null,
      content: "Salut",
      thinking: null,
      attachments: [],
    },
  ],
};

function makeFile(): File {
  const json = new JsonSerializer().serialize(sampleEnvelope);
  return new File([json], "chat.json", { type: "application/json" });
}

function makeImporter(): ImportPort & { calls: Chat[] } {
  const calls: Chat[] = [];
  return {
    calls,
    isAvailable: (): boolean => true,
    importChat: (chat: Chat): Promise<void> => {
      calls.push(chat);
      return Promise.resolve();
    },
  };
}

describe("ImportChatUseCase", () => {
  it("lit un JSON et déclenche l'import", async () => {
    const importer = makeImporter();
    const result = await ImportChatUseCase.execute({ file: makeFile(), importer });
    expect(result.messageCount).toBe(2);
    expect(importer.calls).toHaveLength(1);
    expect(importer.calls[0]?.messages).toHaveLength(2);
  });

  it("appelle onProgress aux phases clés", async () => {
    const importer = makeImporter();
    const phases: string[] = [];
    await ImportChatUseCase.execute({
      file: makeFile(),
      importer,
      onProgress: (p) => phases.push(p.phase),
    });
    expect(phases).toContain("reading");
    expect(phases).toContain("chunking");
    expect(phases).toContain("done");
  });

  it("propage les erreurs de lecture", async () => {
    const importer = makeImporter();
    const badFile = new File(["not json"], "bad.json", { type: "application/json" });
    await expect(
      ImportChatUseCase.execute({ file: badFile, importer }),
    ).rejects.toThrow();
  });

  it("propage chunkSize et responseTimeoutMs à l'importer", async () => {
    let received: ImportOptions | undefined;
    const spyImporter: ImportPort = {
      isAvailable: (): boolean => true,
      importChat: (_chat, options): Promise<void> => {
        received = options;
        return Promise.resolve();
      },
    };
    await ImportChatUseCase.execute({
      file: makeFile(),
      importer: spyImporter,
      chunkSize: 1000,
      responseTimeoutMs: 5000,
    });
    expect(received?.chunkSize).toBe(1000);
    expect(received?.responseTimeoutMs).toBe(5000);
  });

  it("retourne le nombre de messages et de chunks", async () => {
    const importer = makeImporter();
    const result = await ImportChatUseCase.execute({ file: makeFile(), importer });
    expect(result.messageCount).toBe(2);
    expect(result.chunkCount).toBeGreaterThanOrEqual(1);
  });
});