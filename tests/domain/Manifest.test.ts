import { describe, expect, it } from "vitest";
import { buildManifest } from "@domain/formats/Manifest.js";
import { CHATBRIDGE_VERSION } from "@domain/formats/ExportEnvelope.js";

const validSha = "a".repeat(64);
const validSource = {
  platform: "deepseek" as const,
  url: "https://chat.deepseek.com/a/chat/s/x",
  title: "Test",
};

describe("buildManifest", () => {
  it("construit un manifeste valide", () => {
    const m = buildManifest({
      exported_at: "2026-09-28T12:00:00Z",
      source: validSource,
      sha256: validSha,
      message_count: 3,
      files: ["chat.json", "chat.md", "manifest.json"],
    });
    expect(m.chatbridge_version).toBe(CHATBRIDGE_VERSION);
    expect(m.message_count).toBe(3);
    expect(m.files).toHaveLength(3);
  });

  it("rejette un sha256 invalide", () => {
    expect(() =>
      buildManifest({
        exported_at: "2026-09-28T12:00:00Z",
        source: validSource,
        sha256: "not-a-hash",
        message_count: 1,
        files: ["chat.json"],
      }),
    ).toThrow(/sha256/);
  });

  it("rejette un message_count négatif", () => {
    expect(() =>
      buildManifest({
        exported_at: "2026-09-28T12:00:00Z",
        source: validSource,
        sha256: validSha,
        message_count: -1,
        files: ["chat.json"],
      }),
    ).toThrow(/message_count/);
  });

  it("rejette un message_count non-entier", () => {
    expect(() =>
      buildManifest({
        exported_at: "2026-09-28T12:00:00Z",
        source: validSource,
        sha256: validSha,
        message_count: 1.5,
        files: ["chat.json"],
      }),
    ).toThrow(/message_count/);
  });

  it("rejette une liste de fichiers vide", () => {
    expect(() =>
      buildManifest({
        exported_at: "2026-09-28T12:00:00Z",
        source: validSource,
        sha256: validSha,
        message_count: 0,
        files: [],
      }),
    ).toThrow(/files/);
  });
});