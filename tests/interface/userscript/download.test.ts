// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadBlob } from "@interface/userscript/download.js";

describe("downloadBlob", () => {
  let clickSpy: ReturnType<typeof vi.fn>;
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clickSpy = vi.fn();
    createObjectURLSpy = vi.fn(() => "blob:mock-url");
    revokeObjectURLSpy = vi.fn();

    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURLSpy,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURLSpy,
    });

    // Intercepte tous les click() sur les <a>
    const originalCreate = Document.prototype.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = originalCreate(tag);
      if (tag === "a") {
        (el as HTMLAnchorElement).click = clickSpy;
      }
      return el;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("crée un blob, un <a download> et clique dessus", () => {
    downloadBlob(new Uint8Array([1, 2, 3]), "test.zip");
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("le <a> est supprimé du DOM après le clic", () => {
    downloadBlob(new Uint8Array([1, 2, 3]), "test.zip");
    expect(document.querySelector("a[download='test.zip']")).toBeNull();
  });

  it("accepte un mime personnalisé", () => {
    downloadBlob(new Uint8Array([1]), "x.bin", "application/octet-stream");
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
  });
});