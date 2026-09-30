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
          "src/application/ports/**",
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
