import type { Chat } from "@domain/models/Chat.js";

export interface ExtractProgress {
  readonly phase: "scrolling" | "extracting" | "done";
  readonly messagesFound: number;
  readonly scrollCount: number;
  /** Pourcentage de progression du scroll (0-100), si calculable. */
  readonly scrollPercent?: number;
}

export interface ExtractOptions {
  readonly onProgress?: (progress: ExtractProgress) => void;
  readonly maxScrolls?: number;
  readonly scrollDelayMs?: number;
  /**
   * Temps (ms) d'attente d'une capture réseau avant de basculer
   * sur l'extraction DOM. 0 = désactivé (utile en test).
   * Défaut : 2500.
   */
  readonly apiWaitMs?: number;
}

export interface ChatSourcePort {
  isAvailable(): boolean;
  extract(options?: ExtractOptions): Promise<Chat>;
}