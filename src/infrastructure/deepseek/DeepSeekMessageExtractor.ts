import type { Attachment, Message, Role } from "@domain/models/index.js";
import { queryAll, queryFirst, textOf } from "./domUtils.js";
import {
  DEFAULT_DEEPSEEK_SELECTORS,
  THINKING_TITLE_REGEX,
  USER_MARKER_CLASS,
  type DeepSeekSelectors,
} from "./selectors.js";

export interface DeepSeekMessageExtractorDeps {
  /** Racine de recherche : `document` ou un élément conteneur. */
  readonly root: Document | Element;
  readonly selectors?: DeepSeekSelectors;
}

/**
 * Extrait les messages DeepSeek visibles dans un DOM donné.
 * Ne gère PAS le scroll — c'est le rôle de VirtualListExtractor.
 * Peut être appelé plusieurs fois sur le même arbre pour capturer
 * les messages au fur et à mesure du défilement.
 */
export class DeepSeekMessageExtractor {
  private readonly root: Document | Element;
  private readonly selectors: DeepSeekSelectors;

  constructor(deps: DeepSeekMessageExtractorDeps) {
    this.root = deps.root;
    this.selectors = deps.selectors ?? DEFAULT_DEEPSEEK_SELECTORS;
  }

  extract(): readonly Message[] {
    const blocks = queryAll(this.root, this.selectors.messageBlock);
    const messages: Message[] = [];
    for (const block of blocks) {
      const msg = this.extractOne(block, messages.length);
      if (msg !== null) {
        messages.push(msg);
      }
    }
    return messages;
  }

  private extractOne(block: Element, index: number): Message | null {
    const isUser = block.className.includes(USER_MARKER_CLASS);
    const role: Role = isUser ? "user" : "assistant";

    let content = "";
    let thinking: string | null = null;
    let attachments: readonly Attachment[] = [];

    if (isUser) {
      content = this.extractUserText(block);
      attachments = this.extractAttachments(block);
    } else {
      content = this.extractAssistantContent(block);
      thinking = this.extractThinking(block);
    }

    if (content === "" && thinking === null && attachments.length === 0) {
      return null;
    }
    return { index, role, timestamp: null, content, thinking, attachments };
  }

  private extractAssistantContent(block: Element): string {
    const el = queryFirst(block, this.selectors.assistantContent);
    return el === null ? "" : textOf(el);
  }

  private extractUserText(block: Element): string {
    const el = queryFirst(block, this.selectors.userTextContent);
    return el === null ? "" : textOf(el);
  }

  private extractThinking(block: Element): string | null {
    const el = queryFirst(block, this.selectors.thinkingBlock);
    if (el === null) {
      return null;
    }
    const raw = textOf(el);
    if (raw === "") {
      return null;
    }
    const cleaned = raw.replace(THINKING_TITLE_REGEX, "").trim();
    return cleaned === "" ? null : cleaned;
  }

  private extractAttachments(block: Element): readonly Attachment[] {
    const el = queryFirst(block, this.selectors.userAttachment);
    if (el === null) {
      return [];
    }
    const nameEl = queryFirst(el, this.selectors.attachmentName);
    if (nameEl === null) {
      return [];
    }
    const name = textOf(nameEl);
    if (name === "") {
      return [];
    }
    return [{ name, mimeType: "application/octet-stream", sizeBytes: 0 }];
  }
}