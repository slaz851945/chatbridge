import type { Platform } from "@domain/models/ChatSource.js";

/**
 * Détecte la plateforme à partir d'une URL.
 * Retourne null si inconnue.
 */
export function detectPlatform(url: string): Platform | null {
  if (url.includes("chat.deepseek.com")) {
    return "deepseek";
  }
  if (url.includes("chat.openai.com") || url.includes("chatgpt.com")) {
    return "chatgpt";
  }
  return null;
}