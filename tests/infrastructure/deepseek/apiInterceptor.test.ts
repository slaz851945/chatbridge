// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  __resetInterceptorForTests,
  clearCapture,
  findMessageArray,
  getCapture,
  installDeepSeekApiInterceptor,
  waitForCapture,
} from "@infrastructure/deepseek/apiInterceptor.js";

function ensureFetch(): void {
  if (typeof window.fetch !== "function") {
    window.fetch = (() =>
      Promise.reject(new Error("no fetch in test env")));
  }
}

function makeResponse(payload: unknown, failJson = false): Response {
  const obj = {
    json: (): Promise<unknown> =>
      failJson
        ? Promise.reject(new Error("not json"))
        : Promise.resolve(payload),
    clone(): object {
      return this;
    },
  };
  return obj as unknown as Response;
}

describe("findMessageArray", () => {
  it("retourne [] pour un objet sans messages", () => {
    expect(findMessageArray({ foo: "bar" })).toEqual([]);
  });

  it("détecte un tableau direct de messages", () => {
    const json = {
      messages: [
        { role: "user", content: "Bonjour" },
        { role: "assistant", content: "Salut" },
      ],
    };
    const result = findMessageArray(json);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ role: "user", content: "Bonjour" });
    expect(result[1]).toMatchObject({ role: "assistant", content: "Salut" });
  });

  it("détecte des messages imbriqués profondément", () => {
    const json = {
      data: {
        conversation: {
          messages: [
            { role: "user", text: "Q1" },
            { role: "assistant", text: "R1" },
            { role: "user", text: "Q2" },
          ],
        },
      },
    };
    const result = findMessageArray(json);
    expect(result).toHaveLength(3);
    expect(result[0]?.content).toBe("Q1");
  });

  it("extrait le thinking si présent", () => {
    const json = {
      messages: [{ role: "assistant", content: "R", thinking: "réflexion" }],
    };
    expect(findMessageArray(json)[0]?.thinking).toBe("réflexion");
  });

  it("accepte content sous forme d'objet {text}", () => {
    const json = {
      messages: [{ role: "user", content: { text: "via objet" } }],
    };
    expect(findMessageArray(json)[0]?.content).toBe("via objet");
  });

  it("accepte content sous forme de tableau de parts", () => {
    const json = {
      messages: [
        {
          role: "assistant",
          content: [{ text: "partie 1 " }, { text: "partie 2" }],
        },
      ],
    };
    expect(findMessageArray(json)[0]?.content).toBe("partie 1 partie 2");
  });

  it("ignore les messages sans contenu textuel", () => {
    const json = {
      messages: [
        { role: "user", content: "" },
        { role: "assistant", content: "ok" },
      ],
    };
    expect(findMessageArray(json)).toHaveLength(1);
  });

  it("ignore les objets sans champ role", () => {
    const json = {
      messages: [{ content: "orphelin" }, { role: "user", content: "ok" }],
    };
    expect(findMessageArray(json)).toHaveLength(1);
  });

  it("retourne [] pour null / primitives", () => {
    expect(findMessageArray(null)).toEqual([]);
    expect(findMessageArray(42)).toEqual([]);
    expect(findMessageArray("string")).toEqual([]);
  });
});

describe("installDeepSeekApiInterceptor — basique", () => {
  beforeEach(() => {
    __resetInterceptorForTests();
    clearCapture();
  });

  afterEach(() => {
    __resetInterceptorForTests();
    clearCapture();
  });

  it("patche window.fetch", () => {
    ensureFetch();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const before = window.fetch;
    installDeepSeekApiInterceptor();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(window.fetch).not.toBe(before);
  });

  it("getCapture() = null au départ", () => {
    expect(getCapture()).toBeNull();
  });

  it("clearCapture() remet à null", () => {
    clearCapture();
    expect(getCapture()).toBeNull();
  });

  it("waitForCapture(0) retourne immédiatement", async () => {
    const result = await waitForCapture(0);
    expect(result).toBeNull();
  });

  it("waitForCapture avec timeout court retourne null si rien capturé", async () => {
    const result = await waitForCapture(50);
    expect(result).toBeNull();
  });

  it("installer deux fois ne lève pas", () => {
    ensureFetch();
    installDeepSeekApiInterceptor();
    expect(() => {
      installDeepSeekApiInterceptor();
    }).not.toThrow();
  });
});

describe("installDeepSeekApiInterceptor — interception fetch", () => {
  beforeEach(() => {
    __resetInterceptorForTests();
    clearCapture();
    ensureFetch();
  });

  afterEach(() => {
    __resetInterceptorForTests();
    clearCapture();
  });

  it("capture une réponse fetch contenant un tableau de messages", async () => {
    const payload = {
      data: {
        messages: [
          { role: "user", content: "u1" },
          { role: "assistant", content: "a1" },
          { role: "user", content: "u2" },
          { role: "assistant", content: "a2" },
          { role: "user", content: "u3" },
          { role: "assistant", content: "a3" },
        ],
      },
    };
    window.fetch = (() =>
      Promise.resolve(makeResponse(payload)));
    installDeepSeekApiInterceptor();

    await window.fetch("https://chat.deepseek.com/api/history_messages");
    await new Promise<void>((r) => {
      setTimeout(r, 40);
    });

    const cap = getCapture();
    expect(cap).not.toBeNull();
    expect(cap?.messages).toHaveLength(6);
    expect(cap?.url).toBe("https://chat.deepseek.com/api/history_messages");
  });

  it("ignore les URLs hors /api/", async () => {
    const payload = {
      messages: Array.from({ length: 6 }, (_, i) => ({
        role: "user",
        content: `x${String(i)}`,
      })),
    };
    window.fetch = (() =>
      Promise.resolve(makeResponse(payload)));
    installDeepSeekApiInterceptor();

    await window.fetch("https://chat.deepseek.com/some-other-path");
    await new Promise<void>((r) => {
      setTimeout(r, 40);
    });

    expect(getCapture()).toBeNull();
  });

  it("ignore une réponse dont le JSON échoue", async () => {
    window.fetch = (() =>
      Promise.resolve(makeResponse(null, true)));
    installDeepSeekApiInterceptor();

    await window.fetch("https://chat.deepseek.com/api/x");
    await new Promise<void>((r) => {
      setTimeout(r, 40);
    });

    expect(getCapture()).toBeNull();
  });

  it("ne capture pas si moins de 5 messages", async () => {
    const payload = {
      messages: [
        { role: "user", content: "a" },
        { role: "assistant", content: "b" },
      ],
    };
    window.fetch = (() =>
      Promise.resolve(makeResponse(payload)));
    installDeepSeekApiInterceptor();

    await window.fetch("https://chat.deepseek.com/api/history");
    await new Promise<void>((r) => {
      setTimeout(r, 40);
    });

    expect(getCapture()).toBeNull();
  });

  it("waitForCapture retourne la capture quand elle apparaît", async () => {
    const payload = {
      messages: Array.from({ length: 6 }, (_, i) => ({
        role: "user",
        content: `w${String(i)}`,
      })),
    };
    window.fetch = (() =>
      Promise.resolve(makeResponse(payload)));
    installDeepSeekApiInterceptor();

    const waitPromise = waitForCapture(1000);
    setTimeout(() => {
      void window.fetch("https://chat.deepseek.com/api/history");
    }, 50);
    const cap = await waitPromise;
    expect(cap).not.toBeNull();
    expect(cap?.messages.length).toBe(6);
  });

  it("fetch non /api/ passe sans capture (branche early-return)", async () => {
    const payload = { messages: [] };
    window.fetch = (() =>
      Promise.resolve(makeResponse(payload)));
    installDeepSeekApiInterceptor();

    const response = await window.fetch("https://example.com/data");
    expect(response).not.toBeNull();
    expect(getCapture()).toBeNull();
  });
});