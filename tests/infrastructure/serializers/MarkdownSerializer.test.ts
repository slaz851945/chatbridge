import { describe, expect, it } from "vitest";
import { ExportChatUseCase } from "@application/export/ExportChatUseCase.js";
import type { Chat } from "@domain/models/Chat.js";
import { MarkdownSerializer } from "@infrastructure/serializers/MarkdownSerializer.js";

const sampleChat: Chat = {
  source: {
    platform: "deepseek",
    url: "https://chat.deepseek.com/a/chat/s/abc",
    title: "Ma Conversation",
  },
  messages: [
    {
      index: 0,
      role: "user",
      timestamp: "2026-09-28T12:00:00Z",
      content: "Bonjour",
      thinking: null,
      attachments: [],
    },
    {
      index: 1,
      role: "assistant",
      timestamp: null,
      content: "Réponse",
      thinking: "Je réfléchis",
      attachments: [],
    },
  ],
};

async function render(): Promise<string> {
  const env = await ExportChatUseCase.execute(
    sampleChat,
    new Date("2026-09-28T14:00:00.000Z"),
  );
  return new MarkdownSerializer().serialize(env);
}

describe("MarkdownSerializer", () => {
  it("contient le titre du chat", async () => {
    const md = await render();
    expect(md).toContain("# Ma Conversation");
  });

  it("contient les métadonnées (plateforme, url, version, sha)", async () => {
    const md = await render();
    expect(md).toContain("**Plateforme** : deepseek");
    expect(md).toContain("**URL source** : https://chat.deepseek.com/a/chat/s/abc");
    expect(md).toContain("**Version ChatBridge** : 0.1.0");
    expect(md).toMatch(/\*\*SHA-256\*\* : `[a-f0-9]{64}`/);
  });

  it("numérote les messages avec leur rôle", async () => {
    const md = await render();
    expect(md).toContain("## [0] user — 2026-09-28T12:00:00Z");
    expect(md).toContain("## [1] assistant — —");
  });

  it("affiche le thinking en bloc <details>", async () => {
    const md = await render();
    expect(md).toContain("<details>");
    expect(md).toContain("🧠 Thinking");
    expect(md).toContain("Je réfléchis");
  });

  it("n'affiche pas de <details> si thinking est null", async () => {
    const env = await ExportChatUseCase.execute(
      { ...sampleChat, messages: [sampleChat.messages[0]!] },
      new Date(),
    );
    const md = new MarkdownSerializer().serialize(env);
    expect(md).not.toContain("<details>");
  });

  it("le titre fallback est utilisé si title est vide", async () => {
    const env = await ExportChatUseCase.execute(
      { ...sampleChat, source: { ...sampleChat.source, title: "" } },
      new Date(),
    );
    const md = new MarkdownSerializer().serialize(env);
    expect(md).toContain("# Chat export");
  });

  it("formatName et fileExtension sont corrects", () => {
    const s = new MarkdownSerializer();
    expect(s.formatName).toBe("markdown");
    expect(s.fileExtension).toBe("md");
  });
});