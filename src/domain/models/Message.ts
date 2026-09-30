import type { Attachment } from "./Attachment.js";
import { isRole, type Role } from "./Role.js";

/**
 * Message unitaire d'une conversation.
 * Immuable par construction : `readonly` partout.
 */
export interface Message {
  readonly index: number;
  readonly role: Role;
  readonly timestamp: string | null; // ISO 8601 UTC, ou null si inconnu
  readonly content: string;
  readonly thinking: string | null;
  readonly attachments: readonly Attachment[];
}

/**
 * Validation structurelle d'un message brut (issu d'un parseur ou d'un JSON).
 * Lève une Error si le message est invalide.
 */
export function assertValidMessage(value: unknown): asserts value is Message {
  if (typeof value !== "object" || value === null) {
    throw new Error("Message must be an object");
  }
  const m = value as Record<string, unknown>;

  if (typeof m.index !== "number" || !Number.isInteger(m.index) || m.index < 0) {
    throw new Error("Message.index must be a non-negative integer");
  }
  if (!isRole(m.role)) {
    throw new Error(`Message.role invalid: ${String(m.role)}`);
  }
  if (m.timestamp !== null && typeof m.timestamp !== "string") {
    throw new Error("Message.timestamp must be a string or null");
  }
  if (typeof m.content !== "string") {
    throw new Error("Message.content must be a string");
  }
  if (m.thinking !== null && typeof m.thinking !== "string") {
    throw new Error("Message.thinking must be a string or null");
  }
  if (!Array.isArray(m.attachments)) {
    throw new Error("Message.attachments must be an array");
  }
}
