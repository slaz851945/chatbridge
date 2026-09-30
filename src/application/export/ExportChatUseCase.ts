import { CHATBRIDGE_VERSION, type ExportEnvelope } from "@domain/formats/ExportEnvelope.js";
import { HashService } from "@domain/hashing/HashService.js";
import type { Chat } from "@domain/models/Chat.js";

/**
 * Cas d'usage : transformer un Chat (domaine) en ExportEnvelope sérialisable.
 * Ne dépend d'aucune infra — pur et testable.
 */
export class ExportChatUseCase {
  static async execute(chat: Chat, now: Date = new Date()): Promise<ExportEnvelope> {
    const sha256 = await HashService.hashMessages(chat.messages);
    return {
      chatbridge_version: CHATBRIDGE_VERSION,
      exported_at: now.toISOString(),
      source: chat.source,
      sha256,
      messages: chat.messages,
    };
  }
}
