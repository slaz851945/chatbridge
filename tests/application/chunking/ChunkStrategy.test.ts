import { describe, expect, it } from "vitest";
import { ChunkStrategy } from "@application/chunking/ChunkStrategy.js";
import type { Message } from "@domain/models/Message.js";

function msg(i: number, content: string, role: "user" | "assistant" = "user"): Message {
  return { index: i, role, timestamp: null, content, thinking: null, attachments: [] };
}

describe("ChunkStrategy", () => {
  it("retourne [] pour un chat vide", () => {
    expect(ChunkStrategy.chunk([])).toEqual([]);
  });

  it("un petit chat tient dans un seul chunk", () => {
    const chunks = ChunkStrategy.chunk([msg(0, "a"), msg(1, "b")]);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.text).toContain("[ChatBridge - Import - 1/1]");
    expect(chunks[0]?.messageStart).toBe(0);
    expect(chunks[0]?.messageEnd).toBe(2);
  });

  it("segmente quand la taille max est dépassée", () => {
    const messages = Array.from({ length: 20 }, (_, i) => msg(i, "x".repeat(500)));
    const chunks = ChunkStrategy.chunk(messages, { maxChars: 1500 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.text.length).toBeLessThanOrEqual(2500);
    }
  });

  it("attribue un index et un total corrects", () => {
    const messages = Array.from({ length: 20 }, (_, i) => msg(i, "x".repeat(500)));
    const chunks = ChunkStrategy.chunk(messages, { maxChars: 1500 });
    // Les index doivent être séquentiels à partir de 0, quelle que soit
    // la taille de la segmentation.
    const expectedIndexes = chunks.map((_, i) => i);
    expect(chunks.map((c) => c.index)).toEqual(expectedIndexes);
    // Chaque chunk doit connaître le total.
    for (const c of chunks) {
      expect(c.total).toBe(chunks.length);
    }
  });

  it("respecte le headerPrefix personnalisé", () => {
    const chunks = ChunkStrategy.chunk([msg(0, "a")], { headerPrefix: "Test" });
    expect(chunks[0]?.text).toContain("[Test - 1/1]");
  });

  it("inclut le thinking dans le rendu", () => {
    const m: Message = {
      index: 0, role: "assistant", timestamp: null,
      content: "Réponse", thinking: "Réflexion", attachments: [],
    };
    const chunks = ChunkStrategy.chunk([m]);
    expect(chunks[0]?.text).toContain("🧠 Thinking");
    expect(chunks[0]?.text).toContain("Réflexion");
  });
});