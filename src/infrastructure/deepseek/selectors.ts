/**
 * Sélecteurs DeepSeek réels — calibrés sur le DOM observé (2026-09).
 * DeepSeek utilise une liste virtualisée : seuls ~5-10 messages
 * sont présents dans le DOM à un instant donné.
 */
export interface DeepSeekSelectors {
  readonly messageBlock: readonly string[];
  readonly assistantContent: readonly string[];
  readonly userTextContent: readonly string[];
  readonly userAttachment: readonly string[];
  readonly attachmentName: readonly string[];
  readonly thinkingBlock: readonly string[];
  readonly scrollContainer: readonly string[];
}

export const DEFAULT_DEEPSEEK_SELECTORS: DeepSeekSelectors = {
  messageBlock: ["div.ds-message"],
  assistantContent: ['[class*="assistant-message-main-content"]'],
  userTextContent: [".fbb737a4"],
  userAttachment: [".eafda4ae"],
  attachmentName: [".e70accd6"],
  thinkingBlock: ["._74c0879"],
  scrollContainer: [".ds-virtual-list"],
};

/** Marqueur de classe présent uniquement sur les messages utilisateur. */
export const USER_MARKER_CLASS = "d29f3d7d";

/** Préfixe à retirer des blocs thinking. */
export const THINKING_TITLE_REGEX = /^Thought for \d+(?:\.\d+)?\s*(?:second|minute)s?\s*/i;