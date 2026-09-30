import { ZipBundle } from "@application/bundle/ZipBundle.js";
import {
  ExportFlow,
  type ExportFlowResult,
} from "@application/export/ExportFlow.js";
import { ImportChatUseCase } from "@application/import/ImportChatUseCase.js";
import type { ChatSourcePort } from "@application/ports/ChatSourcePort.js";
import { installDeepSeekApiInterceptor } from "@infrastructure/deepseek/apiInterceptor.js";
import { realClock } from "@infrastructure/deepseek/clock.js";
import { DeepSeekAdapter } from "@infrastructure/deepseek/DeepSeekAdapter.js";
import { DeepSeekImporter } from "@infrastructure/deepseek/DeepSeekImporter.js";
import { downloadBlob } from "./download.js";
import { detectPlatform } from "./platform.js";
import { Panel, type ExporterProgress } from "./ui/Panel.js";

installDeepSeekApiInterceptor();

function buildAdapter(): ChatSourcePort | null {
  const platform = detectPlatform(window.location.href);
  if (platform === "deepseek") {
    return new DeepSeekAdapter({ window, document, clock: realClock });
  }
  return null;
}

function mountPanel(): void {
  const adapter = buildAdapter();
  if (!adapter?.isAvailable()) return;

  const flow = new ExportFlow();
  const bundle = new ZipBundle();
  const importer = new DeepSeekImporter({ window, document, clock: realClock });

  const panel = new Panel({
    exporter: async (onProgress: ExporterProgress): Promise<ExportFlowResult> => {
      const result = await flow.run({
        chatSource: adapter,
        bundle,
        onProgress: (p) => {
          if (p.phase === "extracting") {
            onProgress("⏳ Attente requête…");
          } else {
            onProgress(
              `⏳ ${String(p.messagesFound)} msgs (${String(p.scrollPercent ?? 0)}%)`,
            );
          }
        },
      });
      downloadBlob(result.bytes, result.fileName);
      return result;
    },
    importer: async (file, { compact }, onProgress): Promise<void> => {
      await ImportChatUseCase.execute({
        file,
        importer,
        compact,
        onProgress: (p) => {
          if (p.phase === "reading") {
            onProgress("📖 Lecture du fichier…");
          } else if (p.phase === "chunking") {
            onProgress("✂️ Segmentation…");
          } else if (p.phase === "sending") {
            onProgress(
              `📤 Envoi ${String(p.chunkIndex + 1)}/${String(p.chunkCount)}…`,
            );
          } else if (p.phase === "waiting") {
            onProgress(
              `⏳ Réponse ${String(p.chunkIndex)}/${String(p.chunkCount)}…`,
            );
          } else if (p.phase === "pausing") {
            onProgress(
              `⏸️ Pause anti rate-limit (chunk ${String(p.chunkIndex + 1)}/${String(p.chunkCount)})…`,
            );
          } else {
            onProgress(`✅ ${String(p.messageCount)} messages importés`);
          }
        },
      });
    },
    onError: (err): void => {
      console.error("[ChatBridge] error:", err);
    },
  });
  panel.mount(document.body);
  console.info("[ChatBridge] userscript prêt — panneau monté.");
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      mountPanel();
    },
    { once: true },
  );
} else {
  mountPanel();
}