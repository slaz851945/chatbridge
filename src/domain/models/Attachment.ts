/**
 * Pièce jointe textuelle attachée à un message.
 * Pour v0.1, seuls les métadonnées sont conservées — pas le contenu binaire.
 */
export interface Attachment {
  readonly name: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
}
