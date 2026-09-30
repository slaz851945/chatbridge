import { ChunkStrategy, type Chunk } from "@application/chunking/ChunkStrategy.js";
import type { ImportPort, ImportProgress } from "@application/ports/ImportPort.js";
import type { ExportEnvelope } from "@domain/formats/ExportEnvelope.js";
import type { Chat } from "@domain/models/Chat.js";
import { readBundle } from "./bundleReader.js";

export interface ImportChatInput {
  readonly file: File;
  readonly importer: ImportPort;
  readonly onProgress?: (progress: ImportProgress) => void;
  readonly chunkSize?: number;
  readonly responseTimeoutMs?: number;
  readonly compact?: boolean;
}

export interface ImportChatResult {
  readonly chunkCount: number;
  readonly messageCount: number;
  readonly compact: boolean;
}

export class ImportChatUseCase {
  static async execute(input: ImportChatInput): Promise<ImportChatResult> {
    input.onProgress?.({
      phase: "reading",
      chunkIndex: 0,
      chunkCount: 0,
      messageCount: 0,
    });

    const envelope: ExportEnvelope = await readBundle(input.file);
    const chat: Chat = {
      source: envelope.source,
      messages: envelope.messages,
    };

    input.onProgress?.({
      phase: "chunking",
      chunkIndex: 0,
      chunkCount: 0,
      messageCount: chat.messages.length,
    });

    const compact = input.compact ?? false;
    const chunks: readonly Chunk[] = ChunkStrategy.chunk(chat.messages, {
      ...(input.chunkSize !== undefined && { maxChars: input.chunkSize }),
      ...(compact && { compact: true }),
    });

    await input.importer.importChat(chat, {
      ...(input.onProgress !== undefined && { onProgress: input.onProgress }),
      ...(input.chunkSize !== undefined && { chunkSize: input.chunkSize }),
      ...(input.responseTimeoutMs !== undefined && {
        responseTimeoutMs: input.responseTimeoutMs,
      }),
      compact,
    });

    input.onProgress?.({
      phase: "done",
      chunkIndex: chunks.length,
      chunkCount: chunks.length,
      messageCount: chat.messages.length,
    });

    return {
      chunkCount: chunks.length,
      messageCount: chat.messages.length,
      compact,
    };
  }
}