import type { ChatSource } from "./ChatSource.js";
import type { Message } from "./Message.js";

/**
 * Conversation complète — pure, sans hash ni métadonnées d'export.
 * Le hash et la version sont ajoutés au moment de la sérialisation
 * (voir `ExportEnvelope`).
 */
export interface Chat {
  readonly source: ChatSource;
  readonly messages: readonly Message[];
}
