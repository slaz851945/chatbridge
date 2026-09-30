import type { Chat } from "@domain/models/Chat.js";

export interface ImportProgress {
  readonly phase: "reading" | "chunking" | "sending" | "waiting" | "pausing" | "done";
  readonly chunkIndex: number;
  readonly chunkCount: number;
  readonly messageCount: number;
}

export interface ImportOptions {
  readonly onProgress?: (progress: ImportProgress) => void;
  readonly chunkSize?: number;
  readonly responseTimeoutMs?: number;
  /** Si true : les messages assistant sont tronqués, thinking supprimés. */
  readonly compact?: boolean;
}

export interface ImportPort {
  isAvailable(): boolean;
  importChat(chat: Chat, options?: ImportOptions): Promise<void>;
}