import { describe, expect, it } from "vitest";
import { ExportChatUseCase } from "@application/export/ExportChatUseCase.js";
import { CHATBRIDGE_VERSION } from "@domain/formats/ExportEnvelope.js";
import type { Chat } from "@domain/models/Chat.js";

const sampleChat: Chat = {
  source: {
    platform: "deepseek",
    url: "https://chat.deepseek.com/a/chat/s/abc",
    title: "Test",
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
      content: "Salut",
      thinking: "réflexion",
      attachments: [],
    },
  ],
};

describe("ExportChatUseCase", () => {
  it("produit une enveloppe conforme au schéma v0.1", async () => {
    const fixed = new Date("2026-09-28T12:00:00.000Z");
    const env = await ExportChatUseCase.execute(sampleChat, fixed);
    expect(env.chatbridge_version).toBe(CHATBRIDGE_VERSION);
    expect(env.exported_at).toBe("2026-09-28T12:00:00.000Z");
    expect(env.source).toEqual(sampleChat.source);
    expect(env.messages).toHaveLength(2);
    expect(env.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produit un hash stable pour un chat donné", async () => {
    const env1 = await ExportChatUseCase.execute(sampleChat);
    const env2 = await ExportChatUseCase.execute(sampleChat);
    expect(env1.sha256).toBe(env2.sha256);
  });

  it("change le hash si un message change", async () => {
    const env1 = await ExportChatUseCase.execute(sampleChat);
    const first = sampleChat.messages[0]!;
    const modified: Chat = {
      ...sampleChat,
      messages: [{ ...first, content: "Autre" }, ...sampleChat.messages.slice(1)],
    };
    const env2 = await ExportChatUseCase.execute(modified);
    expect(env1.sha256).not.toBe(env2.sha256);
  });
});
