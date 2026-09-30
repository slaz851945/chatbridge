import { describe, expect, it } from "vitest";
import { HashService } from "@domain/hashing/HashService.js";

describe("HashService", () => {
  it("produit un SHA-256 connu pour une chaîne vide", async () => {
    const hash = await HashService.sha256("");
    expect(hash).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("produit un SHA-256 connu pour 'abc'", async () => {
    const hash = await HashService.sha256("abc");
    expect(hash).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("hashMessages est stable et déterministe", async () => {
    const messages = [
      { index: 0, role: "user", content: "Bonjour", thinking: null },
      { index: 1, role: "assistant", content: "Salut", thinking: "hmm" },
    ];
    const h1 = await HashService.hashMessages(messages);
    const h2 = await HashService.hashMessages(messages);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("hashMessages change si un thinking change", async () => {
    const base = [{ index: 0, role: "assistant", content: "x", thinking: null }];
    const modified = [{ index: 0, role: "assistant", content: "x", thinking: "y" }];
    expect(await HashService.hashMessages(base)).not.toBe(
      await HashService.hashMessages(modified),
    );
  });
});
