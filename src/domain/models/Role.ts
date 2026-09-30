/**
 * Rôle d'un message dans une conversation LLM.
 * Volontairement restreint au strict nécessaire pour v0.1.
 */
export type Role = "user" | "assistant" | "system";

export const ROLES: readonly Role[] = ["user", "assistant", "system"];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
