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
        "run-at": "document-start",
      },
    }),
  ],
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
