import type { SerializerPort } from "@application/ports/SerializerPort.js";
import type { ExportEnvelope } from "@domain/formats/ExportEnvelope.js";
import type { Message } from "@domain/models/Message.js";

/**
 * Sérialiseur Markdown lisible — pensé pour relecture humaine.
 * Les blocs `thinking` sont rendus en `<details>` repliables.
 * N'implémente pas `deserialize` : Markdown n'est pas round-trip par nature.
 */
export class MarkdownSerializer implements SerializerPort {
  readonly formatName = "markdown";
  readonly fileExtension = "md";

  serialize(envelope: ExportEnvelope): string {
    const lines: string[] = [];
    lines.push(`# ${envelope.source.title || "Chat export"}`);
    lines.push("");
    lines.push(`> **Plateforme** : ${envelope.source.platform}`);
    lines.push(`> **URL source** : ${envelope.source.url}`);
    lines.push(`> **Exporté le** : ${envelope.exported_at}`);
    lines.push(`> **Version ChatBridge** : ${envelope.chatbridge_version}`);
    lines.push(`> **SHA-256** : \`${envelope.sha256}\``);
    lines.push(`> **Messages** : ${String(envelope.messages.length)}`);
    lines.push("");
    lines.push("---");
    lines.push("");

    for (const m of envelope.messages) {
      lines.push(renderMessage(m));
      lines.push("");
      lines.push("---");
      lines.push("");
    }
    return lines.join("\n").trimEnd() + "\n";
  }
}

function renderMessage(m: Message): string {
  const parts: string[] = [];
  const ts = m.timestamp ?? "—";
  parts.push(`## [${String(m.index)}] ${m.role} — ${ts}`);
  parts.push("");

  if (m.thinking !== null && m.thinking !== "") {
    parts.push("<details>");
    parts.push("<summary>🧠 Thinking</summary>");
    parts.push("");
    parts.push(m.thinking);
    parts.push("");
    parts.push("</details>");
    parts.push("");
  }

  parts.push(m.content);
  return parts.join("\n");
}