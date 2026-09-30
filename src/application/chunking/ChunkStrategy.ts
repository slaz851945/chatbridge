import type { Message } from "@domain/models/Message.js";

export interface Chunk {
  readonly index: number;
  readonly total: number;
  readonly text: string;
  readonly messageStart: number;
  readonly messageEnd: number;
  readonly charCount: number;
}

export interface ChunkOptions {
  readonly maxChars?: number;
  readonly headerPrefix?: string;
  /** Si true : tronque les longs messages, supprime les thinking. */
  readonly compact?: boolean;
}

const DEFAULT_MAX_CHARS = 12_000;
const DEFAULT_PREFIX = "ChatBridge - Import";
const COMPACT_ASSISTANT_LIMIT = 800;

export class ChunkStrategy {
  static chunk(
    messages: readonly Message[],
    options: ChunkOptions = {},
  ): readonly Chunk[] {
    const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;
    const prefix = options.headerPrefix ?? DEFAULT_PREFIX;
    const compact = options.compact ?? false;

    const rendered = messages.map((m) => renderMessage(m, compact));

    const groups: { from: number; to: number; text: string }[] = [];
    let currentFrom = 0;
    let currentBuffer: string[] = [];
    let currentSize = 0;

    for (let i = 0; i < rendered.length; i += 1) {
      const piece = rendered[i] ?? "";
      const pieceSize = piece.length;

      if (currentSize + pieceSize > maxChars && currentBuffer.length > 0) {
        groups.push({
          from: currentFrom,
          to: i,
          text: currentBuffer.join("\n\n"),
        });
        currentFrom = i;
        currentBuffer = [];
        currentSize = 0;
      }

      currentBuffer.push(piece);
      currentSize += pieceSize;
    }

    if (currentBuffer.length > 0) {
      groups.push({
        from: currentFrom,
        to: rendered.length,
        text: currentBuffer.join("\n\n"),
      });
    }

    const total = groups.length;
    return groups.map((g, i) => {
      const header = `[${prefix} - ${String(i + 1)}/${String(total)}]\n\n`;
      const full = header + g.text;
      return {
        index: i,
        total,
        text: full,
        messageStart: g.from,
        messageEnd: g.to,
        charCount: full.length,
      };
    });
  }
}

function renderMessage(m: Message, compact: boolean): string {
  const parts: string[] = [];
  const ts = m.timestamp ?? "—";
  parts.push(`## [${String(m.index)}] ${m.role} — ${ts}`);
  parts.push("");

  if (!compact && m.thinking !== null && m.thinking !== "") {
    parts.push("<details>");
    parts.push("<summary>🧠 Thinking</summary>");
    parts.push("");
    parts.push(m.thinking);
    parts.push("");
    parts.push("</details>");
    parts.push("");
  }

  let content = m.content;
  if (compact && m.role === "assistant" && content.length > COMPACT_ASSISTANT_LIMIT) {
    content = content.slice(0, COMPACT_ASSISTANT_LIMIT) + "\n\n_[…tronqué]_";
  }
  parts.push(content);
  return parts.join("\n");
}