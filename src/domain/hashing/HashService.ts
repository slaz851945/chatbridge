/**
 * Service de hachage SHA-256 — pur, sans état.
 * Fonctionne en environnement navigateur (Web Crypto) et Node 20+.
 */
export class HashService {
  static async sha256(text: string): Promise<string> {
    const data = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Calcule le hash canonique d'une liste de messages.
   * Canonicalisation : concaténation index|role|content|thinking, séparés par \n---\n
   */
  static async hashMessages(
    messages: readonly {
      readonly index: number;
      readonly role: string;
      readonly content: string;
      readonly thinking: string | null;
    }[],
  ): Promise<string> {
    const canonical = messages
      .map(
        (m) =>
          `${String(m.index)}|${m.role}|${m.content}|${m.thinking ?? ""}`,
      )
      .join("\n---\n");
    return HashService.sha256(canonical);
  }
}
