#!/usr/bin/env bash
# ============================================================================
# ChatBridge — correctif post-scaffold T1
# Usage : cd chatbridge && bash fix.sh
# Idempotent : réécrit les fichiers concernés.
# ============================================================================
set -euo pipefail

if [ ! -f package.json ]; then
  echo "Erreur : exécuter depuis la racine du projet chatbridge/" >&2
  exit 1
fi

echo "→ 1/9  vite.config.ts (suppression grant invalide)"
cat > vite.config.ts <<'EOF'
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

export default defineConfig({
  resolve: {
    alias: {
      "@domain": fileURLToPath(new URL("./src/domain", import.meta.url)),
      "@application": fileURLToPath(new URL("./src/application", import.meta.url)),
      "@infrastructure": fileURLToPath(new URL("./src/infrastructure", import.meta.url)),
      "@interface": fileURLToPath(new URL("./src/interface", import.meta.url)),
    },
  },
  plugins: [
    monkey({
      entry: "src/interface/userscript/main.ts",
      userscript: {
        name: "ChatBridge",
        namespace: "https://github.com/chatbridge",
        version: "0.1.0",
        description:
          "Export/import de longs chats LLM (DeepSeek, ChatGPT) — traitement 100% local.",
        author: "Équipe ChatBridge",
        license: "AGPL-3.0-or-later",
        match: [
          "https://chat.deepseek.com/*",
          "https://chat.openai.com/*",
          "https://chatgpt.com/*",
        ],
        "run-at": "document-idle",
      },
    }),
  ],
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
EOF

echo "→ 2/9  eslint.config.js (ignore config + allow static-only classes)"
cat > eslint.config.js <<'EOF'
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "eslint.config.js",
      "vite.config.ts",
      "vitest.config.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/explicit-function-return-type": "warn",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-extraneous-class": [
        "error",
        { allowStaticOnly: true },
      ],
    },
  },
  {
    files: ["**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-confusing-void-expression": "off",
    },
  },
  prettier,
);
EOF

echo "→ 3/9  src/domain/hashing/HashService.ts (crypto + template string)"
cat > src/domain/hashing/HashService.ts <<'EOF'
/**
 * Service de hachage SHA-256 — pur, sans état.
 * Fonctionne en environnement navigateur (Web Crypto) et Node 20+.
 */
export class HashService {
  static async sha256(text: string): Promise<string> {
    const data = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Calcule le hash canonique d'une liste de messages.
   * Canonicalisation : concaténation index|role|content|thinking, séparés par \n---\n
   */
  static async hashMessages(
    messages: readonly {
      readonly index: number;
      readonly role: string;
      readonly content: string;
      readonly thinking: string | null;
    }[],
  ): Promise<string> {
    const canonical = messages
      .map(
        (m) =>
          `${String(m.index)}|${m.role}|${m.content}|${m.thinking ?? ""}`,
      )
      .join("\n---\n");
    return HashService.sha256(canonical);
  }
}
EOF

echo "→ 4/9  src/domain/models/Message.ts (dot-notation + String())"
cat > src/domain/models/Message.ts <<'EOF'
import type { Attachment } from "./Attachment.js";
import { isRole, type Role } from "./Role.js";

/**
 * Message unitaire d'une conversation.
 * Immuable par construction : `readonly` partout.
 */
export interface Message {
  readonly index: number;
  readonly role: Role;
  readonly timestamp: string | null; // ISO 8601 UTC, ou null si inconnu
  readonly content: string;
  readonly thinking: string | null;
  readonly attachments: readonly Attachment[];
}

/**
 * Validation structurelle d'un message brut (issu d'un parseur ou d'un JSON).
 * Lève une Error si le message est invalide.
 */
export function assertValidMessage(value: unknown): asserts value is Message {
  if (typeof value !== "object" || value === null) {
    throw new Error("Message must be an object");
  }
  const m = value as Record<string, unknown>;

  if (typeof m.index !== "number" || !Number.isInteger(m.index) || m.index < 0) {
    throw new Error("Message.index must be a non-negative integer");
  }
  if (!isRole(m.role)) {
    throw new Error(`Message.role invalid: ${String(m.role)}`);
  }
  if (m.timestamp !== null && typeof m.timestamp !== "string") {
    throw new Error("Message.timestamp must be a string or null");
  }
  if (typeof m.content !== "string") {
    throw new Error("Message.content must be a string");
  }
  if (m.thinking !== null && typeof m.thinking !== "string") {
    throw new Error("Message.thinking must be a string or null");
  }
  if (!Array.isArray(m.attachments)) {
    throw new Error("Message.attachments must be an array");
  }
}
EOF

echo "→ 5/9  src/interface/userscript/main.ts (placeholder propre)"
cat > src/interface/userscript/main.ts <<'EOF'
/**
 * Point d'entrée du userscript ChatBridge.
 * ITER-001 / T7 : à compléter avec le panneau flottant + bouton Export.
 */

function bootstrap(): void {
  console.info("[ChatBridge] userscript chargé — version 0.1.0");
  // TODO(ITER-001/T7) : brancher DeepSeekAdapter + ExportChatUseCase + Panneau UI.
}

bootstrap();
EOF

echo "→ 6/9  tests/domain/Message.test.ts (braces + branches manquantes)"
cat > tests/domain/Message.test.ts <<'EOF'
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
EOF

echo "→ 7/9  Ajout tests/domain/ChatSource.test.ts"
mkdir -p tests/domain
cat > tests/domain/ChatSource.test.ts <<'EOF'
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
EOF

echo "→ 8/9  Ajout tests/application/ExportChatUseCase.test.ts"
mkdir -p tests/application
cat > tests/application/ExportChatUseCase.test.ts <<'EOF'
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
EOF

echo "→ 9/9  vitest.config.ts (exclusion fichiers purement typés)"
cat > vitest.config.ts <<'EOF'
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@domain": fileURLToPath(new URL("./src/domain", import.meta.url)),
      "@application": fileURLToPath(new URL("./src/application", import.meta.url)),
      "@infrastructure": fileURLToPath(new URL("./src/infrastructure", import.meta.url)),
      "@interface": fileURLToPath(new URL("./src/interface", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/domain/**", "src/application/**", "src/infrastructure/**"],
      exclude: [
        "**/*.d.ts",
        "**/index.ts",
        "src/domain/models/Attachment.ts",
        "src/domain/models/Chat.ts",
      ],
      thresholds: {
        lines: 82,
        functions: 82,
        branches: 82,
        statements: 82,
      },
    },
  },
});
EOF

echo ""
echo "✅ Correctif appliqué."
echo ""
echo "Vérifie maintenant :"
echo "  npm run typecheck"
echo "  npm run lint"
echo "  npm run test:coverage"
echo "  npm run build"