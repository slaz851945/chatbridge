import { unzipSync, strFromU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { ExportChatUseCase } from "@application/export/ExportChatUseCase.js";
import type { ExportEnvelope } from "@domain/formats/ExportEnvelope.js";
import { ZipBundle } from "@application/bundle/ZipBundle.js";
import type { Chat } from "@domain/models/Chat.js";


const sampleChat: Chat = {
  source: {
    platform: "deepseek",
    url: "https://chat.deepseek.com/a/chat/s/abc",
    title: "Ma Conversation Test",
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
    {
      index: 1,
      role: "assistant",
      timestamp: null,
      content: "Salut !",
      thinking: "Réflexion",
      attachments: [],
    },
  ],
};

async function makeEnvelope(): Promise<ExportEnvelope> {
  return ExportChatUseCase.execute(
    sampleChat,
    new Date("2026-09-28T14:00:00.000Z"),
  );
}

describe("ZipBundle", () => {
  it("produit un ZIP contenant 3 fichiers", async () => {
    const env = await makeEnvelope();
    const { bytes } = new ZipBundle().build(env);
    const files = unzipSync(bytes);
    expect(Object.keys(files).sort()).toEqual([
      "chat.json",
      "chat.md",
      "manifest.json",
    ]);
  });

  it("le JSON inclus est désérialisable", async () => {
    const env = await makeEnvelope();
    const { bytes } = new ZipBundle().build(env);
    const files = unzipSync(bytes);
    const json = strFromU8(files["chat.json"]!);
    const parsed = JSON.parse(json) as Record<string, unknown>;
    expect(parsed.sha256).toBe(env.sha256);
  });

  it("le Markdown inclus contient le titre et les messages", async () => {
    const env = await makeEnvelope();
    const { bytes } = new ZipBundle().build(env);
    const files = unzipSync(bytes);
    const md = strFromU8(files["chat.md"]!);
    expect(md).toContain("# Ma Conversation Test");
    expect(md).toContain("## [0] user");
    expect(md).toContain("## [1] assistant");
  });

  it("le manifeste est cohérent avec l'enveloppe", async () => {
    const env = await makeEnvelope();
    const { bytes, manifest } = new ZipBundle().build(env);
    const files = unzipSync(bytes);
    const parsedManifest = JSON.parse(strFromU8(files["manifest.json"]!)) as Record<string, unknown>;
    expect(parsedManifest.sha256).toBe(env.sha256);
    expect(parsedManifest.message_count).toBe(2);
    expect(parsedManifest).toEqual(manifest);
  });

  it("suggestedName est slugifié et daté", async () => {
    const env = await makeEnvelope();
    const { suggestedName } = new ZipBundle().build(env);
    expect(suggestedName).toBe("chatbridge-ma-conversation-test-2026-09-28");
  });

  it("suggestedName gère un titre vide", async () => {
    const env = await ExportChatUseCase.execute(
      { ...sampleChat, source: { ...sampleChat.source, title: "" } },
      new Date("2026-09-28T14:00:00.000Z"),
    );
    const { suggestedName } = new ZipBundle().build(env);
    expect(suggestedName).toBe("chatbridge-chat-2026-09-28");
  });

  it("noms de fichiers personnalisables", async () => {
    const env = await makeEnvelope();
    const { bytes } = new ZipBundle({
      jsonFileName: "data.json",
      mdFileName: "lisez-moi.md",
      manifestFileName: "info.json",
    }).build(env);
    const files = unzipSync(bytes);
    expect(Object.keys(files).sort()).toEqual([
      "data.json",
      "info.json",
      "lisez-moi.md",
    ]);
  });

  it("build est déterministe (mêmes octets pour même enveloppe)", async () => {
    const env = await makeEnvelope();
    const b1 = new ZipBundle().build(env);
    const b2 = new ZipBundle().build(env);
    expect(b1.bytes).toEqual(b2.bytes);
  });
});