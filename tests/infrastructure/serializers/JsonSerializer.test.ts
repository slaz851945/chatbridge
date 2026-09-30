import { describe, expect, it } from "vitest";
import { ExportChatUseCase } from "@application/export/ExportChatUseCase.js";
import { HashService } from "@domain/hashing/HashService.js";
import type { ExportEnvelope } from "@domain/formats/ExportEnvelope.js";
import type { Chat } from "@domain/models/Chat.js";
import { JsonSerializer } from "@infrastructure/serializers/JsonSerializer.js";

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
      timestamp: "2026-09-28T12:00:00Z",
      content: "Bonjour",
      thinking: null,
      attachments: [],
    },
    {
      index: 1,
      role: "assistant",
      timestamp: "2026-09-28T12:00:05Z",
      content: "Salut !",
      thinking: "Réflexion interne",
      attachments: [{ name: "f.txt", mimeType: "text/plain", sizeBytes: 12 }],
    },
  ],
};

async function makeEnvelope(): Promise<ExportEnvelope> {
  return ExportChatUseCase.execute(sampleChat, new Date("2026-09-28T14:00:00.000Z"));
}

describe("JsonSerializer", () => {
  it("serialize produit un JSON valide avec les bonnes clés", async () => {
    const env = await makeEnvelope();
    const s = new JsonSerializer();
    const text = s.serialize(env);
    const parsed = JSON.parse(text) as Record<string, unknown>;
    expect(parsed.chatbridge_version).toBe("0.1.0");
    expect(parsed.exported_at).toBe("2026-09-28T14:00:00.000Z");
    expect(parsed.sha256).toBe(env.sha256);
    expect(Array.isArray(parsed.messages)).toBe(true);
  });

  it("serialize est déterministe pour une enveloppe donnée", async () => {
    const env = await makeEnvelope();
    const s = new JsonSerializer();
    expect(s.serialize(env)).toBe(s.serialize(env));
  });

  it("round-trip : deserialize(serialize(env)) conserve tous les champs", async () => {
    const env = await makeEnvelope();
    const s = new JsonSerializer();
    const back = s.deserialize(s.serialize(env));
    expect(back).not.toBeNull();
    expect(back?.chatbridge_version).toBe(env.chatbridge_version);
    expect(back?.exported_at).toBe(env.exported_at);
    expect(back?.sha256).toBe(env.sha256);
    expect(back?.source).toEqual(env.source);
    expect(back?.messages).toHaveLength(2);
  });

  it("round-trip : le hash recalculé après désérialisation est identique", async () => {
    const env = await makeEnvelope();
    const s = new JsonSerializer();
    const back = s.deserialize(s.serialize(env));
    const recomputed = await HashService.hashMessages(back?.messages ?? []);
    expect(recomputed).toBe(env.sha256);
  });

  it("deserialize rejette un JSON invalide", () => {
    const s = new JsonSerializer();
    expect(() => s.deserialize("not json")).toThrow(/invalid JSON/);
  });

  it("deserialize rejette une racine non-objet", () => {
    const s = new JsonSerializer();
    expect(() => s.deserialize("[]")).toThrow(/root must be an object/);
  });

  it("deserialize rejette chatbridge_version manquant", () => {
    const s = new JsonSerializer();
    expect(() => s.deserialize('{"exported_at":"x"}')).toThrow(/chatbridge_version/);
  });

  it("deserialize rejette sha256 invalide", async () => {
    const env = await makeEnvelope();
    const s = new JsonSerializer();
    const text = s.serialize(env).replace(env.sha256, "not-a-hash");
    expect(() => s.deserialize(text)).toThrow(/invalid sha256/);
  });

  it("deserialize rejette platform inconnue", async () => {
    const env = await makeEnvelope();
    const s = new JsonSerializer();
    const text = s.serialize(env).replace('"deepseek"', '"mystery"');
    expect(() => s.deserialize(text)).toThrow(/source.platform/);
  });

  it("deserialize rejette un message invalide", async () => {
    const env = await makeEnvelope();
    const s = new JsonSerializer();
    const text = s.serialize(env).replace('"index": 0', '"index": -5');
    expect(() => s.deserialize(text)).toThrow(/index/);
  });

  it("deserialize rejette source manquant", () => {
    const s = new JsonSerializer();
    const bad = JSON.stringify({
      chatbridge_version: "0.1.0",
      exported_at: "2026-09-28T00:00:00Z",
      sha256: "a".repeat(64),
      messages: [],
    });
    expect(() => s.deserialize(bad)).toThrow(/source/);
  });

  it("deserialize rejette messages non-array", () => {
    const s = new JsonSerializer();
    const bad = JSON.stringify({
      chatbridge_version: "0.1.0",
      exported_at: "2026-09-28T00:00:00Z",
      sha256: "a".repeat(64),
      source: { platform: "deepseek", url: "x", title: "y" },
      messages: "nope",
    });
    expect(() => s.deserialize(bad)).toThrow(/messages/);
  });
});