import { describe, expect, it } from "vitest";
import { isPlatform } from "@domain/models/ChatSource.js";

describe("isPlatform", () => {
  it("accepte 'deepseek'", () => {
    expect(isPlatform("deepseek")).toBe(true);
  });

  it("accepte 'chatgpt'", () => {
    expect(isPlatform("chatgpt")).toBe(true);
  });

  it("rejette une plateforme inconnue", () => {
    expect(isPlatform("claude")).toBe(false);
  });

  it("rejette une valeur non-string", () => {
    expect(isPlatform(42)).toBe(false);
  });
});
