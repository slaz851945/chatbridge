// @vitest-environment jsdom
import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { readBundle } from "@application/import/bundleReader.js";
import { JsonSerializer } from "@infrastructure/serializers/JsonSerializer.js";

const envelope = {
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
  ],
};

/**
 * jsdom n'implémente pas File.text() / File.arrayBuffer().
 * On crée un objet qui expose ces 2 méthodes.
 */
function fakeJsonFile(name: string, content: string): File {
  const bytes = new TextEncoder().encode(content);
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return {
    name,
    text: (): Promise<string> => Promise.resolve(content),
    arrayBuffer: (): Promise<ArrayBuffer> => Promise.resolve(buffer),
  } as unknown as File;
}

function fakeZipFile(name: string, bytes: Uint8Array): File {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return {
    name,
    text: (): Promise<string> => Promise.resolve(""),
    arrayBuffer: (): Promise<ArrayBuffer> => Promise.resolve(buffer),
  } as unknown as File;
}

describe("readBundle", () => {
  it("lit un fichier .json", async () => {
    const json = new JsonSerializer().serialize(envelope);
    const env = await readBundle(fakeJsonFile("chat.json", json));
    expect(env.messages).toHaveLength(1);
    expect(env.sha256).toBe(envelope.sha256);
  });

  it("lit un fichier .zip avec chat.json", async () => {
    const json = new JsonSerializer().serialize(envelope);
    const zipped = zipSync({ "chat.json": strToU8(json) });
    const env = await readBundle(fakeZipFile("chat.zip", zipped));
    expect(env.messages).toHaveLength(1);
    expect(env.sha256).toBe(envelope.sha256);
  });

  it("lève une erreur si le ZIP ne contient pas chat.json", async () => {
    const zipped = zipSync({ "manifest.json": strToU8("{}") });
    await expect(readBundle(fakeZipFile("chat.zip", zipped))).rejects.toThrow(
      /chat\.json/,
    );
  });

  it("lève une erreur pour un JSON invalide", async () => {
    await expect(
      readBundle(fakeJsonFile("bad.json", "not json")),
    ).rejects.toThrow();
  });

  it("reconnaît l'extension .ZIP en majuscules", async () => {
    const json = new JsonSerializer().serialize(envelope);
    const zipped = zipSync({ "chat.json": strToU8(json) });
    const env = await readBundle(fakeZipFile("CHAT.ZIP", zipped));
    expect(env.messages).toHaveLength(1);
  });
});