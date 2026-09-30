import { strFromU8, unzipSync } from "fflate";
import type { ExportEnvelope } from "@domain/formats/ExportEnvelope.js";
import { JsonSerializer } from "@infrastructure/serializers/JsonSerializer.js";

/**
 * Lit un fichier `.zip` ChatBridge ou un `.json` brut et retourne l'enveloppe.
 */
export async function readBundle(file: File): Promise<ExportEnvelope> {
  const serializer = new JsonSerializer();

  if (file.name.toLowerCase().endsWith(".zip")) {
    const buf = await file.arrayBuffer();
    const files = unzipSync(new Uint8Array(buf));
    const jsonBytes = files["chat.json"];
    if (jsonBytes === undefined) {
      throw new Error("chat.json introuvable dans le ZIP ChatBridge");
    }
    const parsed = serializer.deserialize(strFromU8(jsonBytes));
    if (parsed === null) {
      throw new Error("Échec de désérialisation du JSON dans le ZIP");
    }
    return parsed;
  }

  const text = await file.text();
  const parsed = serializer.deserialize(text);
  if (parsed === null) {
    throw new Error("Échec de désérialisation du JSON");
  }
  return parsed;
}