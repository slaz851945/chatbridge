import { describe, expect, it } from "vitest";
import { assertValidMessage } from "@domain/models/Message.js";

describe("assertValidMessage", () => {
  const valid = {
    index: 0,
    role: "user",
    timestamp: "2026-09-28T12:00:00Z",
    content: "test",
    thinking: null,
    attachments: [],
  };

  it("accepte un message valide", () => {
    expect(() => {
      assertValidMessage(valid);
    }).not.toThrow();
  });

  it("rejette une valeur null", () => {
    expect(() => {
      assertValidMessage(null);
    }).toThrow(/object/);
  });

  it("rejette une valeur non-objet", () => {
    expect(() => {
      assertValidMessage("string");
    }).toThrow(/object/);
  });

  it("rejette un index négatif", () => {
    expect(() => {
      assertValidMessage({ ...valid, index: -1 });
    }).toThrow(/index/);
  });

  it("rejette un index non-entier", () => {
    expect(() => {
      assertValidMessage({ ...valid, index: 1.5 });
    }).toThrow(/index/);
  });

  it("rejette un index non-numérique", () => {
    expect(() => {
      assertValidMessage({ ...valid, index: "0" });
    }).toThrow(/index/);
  });

  it("rejette un rôle inconnu", () => {
    expect(() => {
      assertValidMessage({ ...valid, role: "wizard" });
    }).toThrow(/role/);
  });

  it("rejette un timestamp non-string non-null", () => {
    expect(() => {
      assertValidMessage({ ...valid, timestamp: 42 });
    }).toThrow(/timestamp/);
  });

  it("rejette un contenu non-string", () => {
    expect(() => {
      assertValidMessage({ ...valid, content: 42 });
    }).toThrow(/content/);
  });

  it("rejette thinking non-string non-null", () => {
    expect(() => {
      assertValidMessage({ ...valid, thinking: 42 });
    }).toThrow(/thinking/);
  });

  it("rejette des attachments non-array", () => {
    expect(() => {
      assertValidMessage({ ...valid, attachments: "nope" });
    }).toThrow(/attachments/);
  });

  it("accepte thinking non-null", () => {
    expect(() => {
      assertValidMessage({ ...valid, thinking: "réflexion" });
    }).not.toThrow();
  });

  it("accepte timestamp null", () => {
    expect(() => {
      assertValidMessage({ ...valid, timestamp: null });
    }).not.toThrow();
  });
});
