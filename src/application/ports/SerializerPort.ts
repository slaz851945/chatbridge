import type { ExportEnvelope } from "@domain/formats/ExportEnvelope.js";

/**
 * Port de sérialisation : transforme une enveloppe d'export en chaîne
 * dans un format cible (JSON, Markdown, TEI XML, …).
 */
export interface SerializerPort {
  /** Nom du format (utilisé pour les extensions de fichier et logs). */
  readonly formatName: string;
  /** Extension de fichier conseillée, sans le point (ex: "json", "md"). */
  readonly fileExtension: string;
  /** Sérialise l'enveloppe en chaîne. */
  serialize(envelope: ExportEnvelope): string;
  /**
   * Désérialise une chaîne en enveloppe.
   * Peut lever une Error si la chaîne est invalide.
   * Renvoie null si le format ne supporte pas la lecture (ex: Markdown seul).
   */
  deserialize?(text: string): ExportEnvelope | null;
}