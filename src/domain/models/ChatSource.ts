export type Platform = "deepseek" | "chatgpt";

export interface ChatSource {
  readonly platform: Platform;
  readonly url: string;
  readonly title: string;
}

export function isPlatform(value: unknown): value is Platform {
  return value === "deepseek" || value === "chatgpt";
}
