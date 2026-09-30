import type {
  ChatSourcePort,
  ExtractProgress,
} from "@application/ports/ChatSourcePort.js";
import type { ZipBundle } from "@application/bundle/ZipBundle.js";
import type { ExportEnvelope } from "@domain/formats/ExportEnvelope.js";
import { ExportChatUseCase } from "./ExportChatUseCase.js";

export interface ExportFlowInput {
  readonly chatSource: ChatSourcePort;
  readonly bundle: ZipBundle;
  readonly now?: () => Date;
  readonly onProgress?: (progress: ExtractProgress) => void;
}

export interface ExportFlowResult {
  readonly fileName: string;
  readonly bytes: Uint8Array;
  readonly messageCount: number;
  readonly sha256: string;
  readonly envelope: ExportEnvelope;
}

/**
 * Orchestrateur : extrait un chat, le sérialise en enveloppe, l'assemble en ZIP.
 * Pur — aucune dépendance au DOM ni au réseau.
 */
export class ExportFlow {
  async run(input: ExportFlowInput): Promise<ExportFlowResult> {
    const extractOptions = input.onProgress
      ? { onProgress: input.onProgress }
      : {};
    const chat = await input.chatSource.extract(extractOptions);
    const now = input.now ? input.now() : new Date();
    const envelope = await ExportChatUseCase.execute(chat, now);
    const bundle = input.bundle.build(envelope);
    return {
      fileName: `${bundle.suggestedName}.zip`,
      bytes: bundle.bytes,
      messageCount: chat.messages.length,
      sha256: envelope.sha256,
      envelope,
    };
  }
}