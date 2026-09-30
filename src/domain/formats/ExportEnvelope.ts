import type { ChatSource } from "../models/ChatSource.js";
import type { Message } from "../models/Message.js";

/**
 * Enveloppe sérialisée d'un export ChatBridge.
 * C'est ce qui est écrit dans le fichier `.json`.
 * Le `sha256` couvre la concaténation canonique des messages.
 */
export interface ExportEnvelope {
  readonly chatbridge_version: string;
  readonly exported_at: string; // ISO 8601 UTC
  readonly source: ChatSource;
  readonly sha256: string;
  readonly messages: readonly Message[];
}

export const CHATBRIDGE_VERSION = "0.1.0";
