import type { SerializerPort } from "@application/ports/SerializerPort.js";
import type { ExportEnvelope } from "@domain/formats/ExportEnvelope.js";
import { assertValidMessage } from "@domain/models/Message.js";
import { isPlatform } from "@domain/models/ChatSource.js";

/**
 * Sérialiseur JSON canonique — indentation 2 espaces, ordre des clés stable.
 * `deserialize` effectue une validation structurelle stricte.
 */
export class JsonSerializer implements SerializerPort {
  readonly formatName = "json";
  readonly fileExtension = "json";

  serialize(envelope: ExportEnvelope): string {
    // Réordonne les clés de manière canonique pour un diff stable.
    const canonical = {
      chatbridge_version: envelope.chatbridge_version,
      exported_at: envelope.exported_at,
      source: {
        platform: envelope.source.platform,
        url: envelope.source.url,
        title: envelope.source.title,
      },
      sha256: envelope.sha256,
      messages: envelope.messages.map((m) => ({
        index: m.index,
        role: m.role,
        timestamp: m.timestamp,
        content: m.content,
        thinking: m.thinking,
        attachments: m.attachments.map((a) => ({
          name: a.name,
          mimeType: a.mimeType,
          sizeBytes: a.sizeBytes,
        })),
      })),
    };
    return JSON.stringify(canonical, null, 2);
  }

  deserialize(text: string): ExportEnvelope | null {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("JsonSerializer.deserialize: invalid JSON");
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("JsonSerializer.deserialize: root must be an object");
    }
    const p = parsed as Record<string, unknown>;

    if (typeof p.chatbridge_version !== "string") {
      throw new Error("JsonSerializer.deserialize: missing chatbridge_version");
    }
    if (typeof p.exported_at !== "string") {
      throw new Error("JsonSerializer.deserialize: missing exported_at");
    }
    if (typeof p.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(p.sha256)) {
      throw new Error("JsonSerializer.deserialize: invalid sha256");
    }
    if (typeof p.source !== "object" || p.source === null) {
      throw new Error("JsonSerializer.deserialize: missing source");
    }
    const source = p.source as Record<string, unknown>;
    if (!isPlatform(source.platform)) {
      throw new Error("JsonSerializer.deserialize: invalid source.platform");
    }
    if (typeof source.url !== "string" || typeof source.title !== "string") {
      throw new Error("JsonSerializer.deserialize: invalid source.url/title");
    }
    if (!Array.isArray(p.messages)) {
      throw new Error("JsonSerializer.deserialize: messages must be an array");
    }
    for (const m of p.messages) {
      assertValidMessage(m);
    }
    return {
      chatbridge_version: p.chatbridge_version,
      exported_at: p.exported_at,
      source: {
        platform: source.platform,
        url: source.url,
        title: source.title,
      },
      sha256: p.sha256,
      messages: p.messages as ExportEnvelope["messages"],
    };
  }
}