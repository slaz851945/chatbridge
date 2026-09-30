import { zipSync, strToU8 } from "fflate";
import type { ExportEnvelope } from "@domain/formats/ExportEnvelope.js";
import {
  buildManifest,
  type ChatBridgeManifest,
} from "@domain/formats/Manifest.js";
import { JsonSerializer } from "@infrastructure/serializers/JsonSerializer.js";
import { MarkdownSerializer } from "@infrastructure/serializers/MarkdownSerializer.js";

export interface ZipBundleOptions {
  /** Nom du JSON dans l'archive. Défaut : "chat.json". */
  readonly jsonFileName?: string;
  /** Nom du Markdown dans l'archive. Défaut : "chat.md". */
  readonly mdFileName?: string;
  /** Nom du manifeste dans l'archive. Défaut : "manifest.json". */
  readonly manifestFileName?: string;
}

export interface ZipBundleResult {
  /** Contenu binaire du ZIP. */
  readonly bytes: Uint8Array;
  /** Manifeste inclus dans l'archive. */
  readonly manifest: ChatBridgeManifest;
  /** Nom de fichier conseillé pour le ZIP (sans extension). */
  readonly suggestedName: string;
}

const DEFAULTS = {
  jsonFileName: "chat.json",
  mdFileName: "chat.md",
  manifestFileName: "manifest.json",
} as const;

/**
 * Assemble un bundle ChatBridge : JSON + Markdown + manifest, dans un ZIP.
 * Fonction pure et déterministe pour une enveloppe donnée.
 */
export class ZipBundle {
  private readonly jsonSerializer: JsonSerializer;
  private readonly mdSerializer: MarkdownSerializer;
  private readonly opts: Required<ZipBundleOptions>;

  constructor(options: ZipBundleOptions = {}) {
    this.jsonSerializer = new JsonSerializer();
    this.mdSerializer = new MarkdownSerializer();
    this.opts = {
      jsonFileName: options.jsonFileName ?? DEFAULTS.jsonFileName,
      mdFileName: options.mdFileName ?? DEFAULTS.mdFileName,
      manifestFileName: options.manifestFileName ?? DEFAULTS.manifestFileName,
    };
  }

  build(envelope: ExportEnvelope): ZipBundleResult {
    const jsonText = this.jsonSerializer.serialize(envelope);
    const mdText = this.mdSerializer.serialize(envelope);

    const manifest = buildManifest({
      exported_at: envelope.exported_at,
      source: envelope.source,
      sha256: envelope.sha256,
      message_count: envelope.messages.length,
      files: [this.opts.jsonFileName, this.opts.mdFileName, this.opts.manifestFileName],
    });
    const manifestText = JSON.stringify(manifest, null, 2);

    const files: Record<string, Uint8Array> = {
      [this.opts.jsonFileName]: strToU8(jsonText),
      [this.opts.mdFileName]: strToU8(mdText),
      [this.opts.manifestFileName]: strToU8(manifestText),
    };
    const bytes = zipSync(files, { level: 6 });

    return {
      bytes,
      manifest,
      suggestedName: this.suggestName(envelope),
    };
  }

  private suggestName(envelope: ExportEnvelope): string {
    const iso = envelope.exported_at.slice(0, 10);
    const slug = slugify(envelope.source.title) || "chat";
    return `chatbridge-${slug}-${iso}`;
  }
}

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}