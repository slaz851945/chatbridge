import type { ChatSource } from "../models/ChatSource.js";
import { CHATBRIDGE_VERSION } from "./ExportEnvelope.js";

/**
 * Manifeste inclus dans chaque archive ChatBridge.
 * Décrit le contenu du bundle sans avoir à ouvrir les fichiers lourds.
 */
export interface ChatBridgeManifest {
  readonly chatbridge_version: string;
  readonly exported_at: string;
  readonly source: ChatSource;
  readonly sha256: string;
  readonly message_count: number;
  readonly files: readonly string[];
}

export interface BuildManifestInput {
  readonly exported_at: string;
  readonly source: ChatSource;
  readonly sha256: string;
  readonly message_count: number;
  readonly files: readonly string[];
}

/**
 * Construit un manifeste valide et immuable.
 * Fonction pure — aucune dépendance.
 */
export function buildManifest(input: BuildManifestInput): ChatBridgeManifest {
  if (!/^[a-f0-9]{64}$/.test(input.sha256)) {
    throw new Error("buildManifest: sha256 must be a 64-char lowercase hex string");
  }
  if (input.message_count < 0 || !Number.isInteger(input.message_count)) {
    throw new Error("buildManifest: message_count must be a non-negative integer");
  }
  if (input.files.length === 0) {
    throw new Error("buildManifest: files must not be empty");
  }
  return {
    chatbridge_version: CHATBRIDGE_VERSION,
    exported_at: input.exported_at,
    source: input.source,
    sha256: input.sha256,
    message_count: input.message_count,
    files: [...input.files],
  };
}