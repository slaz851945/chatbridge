/**
 * Intercepteur réseau DeepSeek.
 *
 * Objectif : capturer l'historique complet des messages sans dépendre
 * du DOM virtualisé (qui ne contient que ~5-10 messages à la fois).
 *
 * On patche window.fetch et XMLHttpRequest.prototype :
 *  - on n'altère PAS la réponse rendue aux autres consommateurs
 *  - on clone la réponse, on tente de la parser en JSON
 *  - on cherche récursivement un tableau de {role, content}
 *  - on conserve la capture la plus riche
 *
 * Le patch doit être installé au document-start, avant que la page
 * n'émette ses propres requêtes.
 */

export interface ApiCapturedMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly thinking: string | null;
  readonly timestamp: string | null;
}

export interface ApiCapture {
  readonly messages: readonly ApiCapturedMessage[];
  readonly capturedAt: number;
  readonly url: string;
}

const MIN_MESSAGES_TO_KEEP = 5;

let capture: ApiCapture | null = null;
let installed = false;
let originalFetch: typeof fetch | null = null;

/**
 * On filtre large : toute URL contenant "/api/". Le tri réel se fait
 * sur la structure de la réponse (présence d'un tableau de messages).
 */
function isRelevantUrl(url: string): boolean {
  return url.includes("/api/");
}

/**
 * Extrait un texte lisible d'une valeur de contenu DeepSeek,
 * qui peut être une string, un objet {text}, ou un tableau de parts.
 */
function extractText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => extractText(v)).join("");
  }
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    if ("text" in obj) {
      return extractText(obj.text);
    }
    if ("content" in obj) {
      return extractText(obj.content);
    }
  }
  return "";
}

/**
 * Cherche récursivement tous les objets {role, content|text}
 * dans un JSON inconnu. Exporté pour testabilité.
 */
export function findMessageArray(obj: unknown): readonly ApiCapturedMessage[] {
  const results: ApiCapturedMessage[] = [];

  function visit(node: unknown): void {
    if (Array.isArray(node)) {
      for (const item of node) {
        if (
          typeof item === "object" &&
          item !== null &&
          "role" in item &&
          ("content" in item || "text" in item)
        ) {
          const m = item as Record<string, unknown>;
          const role = m.role === "user" ? "user" : "assistant";
          const content = extractText(m.content ?? m.text ?? "");
          if (content.length === 0) {
            continue;
          }
          const rawThinking = m.thinking ?? m.reasoning ?? null;
          const thinking =
            typeof rawThinking === "string" ? rawThinking : null;
          results.push({
            role,
            content,
            thinking,
            timestamp: null,
          });
        } else {
          visit(item);
        }
      }
    } else if (typeof node === "object" && node !== null) {
      for (const value of Object.values(node)) {
        visit(value);
      }
    }
  }

  visit(obj);
  return results;
}

function recordCapture(url: string, json: unknown): void {
  const messages = findMessageArray(json);
  if (messages.length < MIN_MESSAGES_TO_KEEP) {
    return;
  }
  if (capture === null || messages.length > capture.messages.length) {
    capture = { messages, capturedAt: Date.now(), url };
    console.info(
      `[ChatBridge] capture API : ${String(messages.length)} messages depuis ${url}`,
    );
  }
}

/**
 * Installe l'intercepteur. Idempotent.
 */
export function installDeepSeekApiInterceptor(): void {
  if (installed) {
    return;
  }
  installed = true;

  // --- Patch fetch ---
  if (typeof window.fetch === "function") {
    originalFetch = window.fetch.bind(window);
    const previousFetch = originalFetch;
    window.fetch = async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      const response = await previousFetch(input, init);
      try {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        if (isRelevantUrl(url)) {
          const clone = response.clone();
          void clone
            .json()
            .then((json: unknown) => {
              recordCapture(url, json);
            })
            .catch(() => {
              /* réponse non-JSON ou déjà consommée */
            });
        }
      } catch {
        /* ignore */
      }
      return response;
    };
  }

  // --- Patch XMLHttpRequest ---
  if (typeof window.XMLHttpRequest === "function") {
    const XhrProto = window.XMLHttpRequest.prototype;

    // Ces deux méthodes sont volontairement détachées : on les rappelle
    // plus bas via `.call(this, …)`, où `this` est explicitement fourni.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalOpen = XhrProto.open;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalSend = XhrProto.send;

    const urlMap = new WeakMap<XMLHttpRequest, string>();

    XhrProto.open = function (
      this: XMLHttpRequest,
      method: string,
      url: string | URL,
      async?: boolean,
      username?: string | null,
      password?: string | null,
    ): void {
      const urlStr = typeof url === "string" ? url : url.href;
      urlMap.set(this, urlStr);
      originalOpen.call(
        this,
        method,
        url,
        async ?? true,
        username ?? null,
        password ?? null,
      );
    };

    XhrProto.send = function (
      this: XMLHttpRequest,
      body?: Document | XMLHttpRequestBodyInit | null,
    ): void {
      const url = urlMap.get(this);
      this.addEventListener("load", () => {
        try {
          if (url === undefined || !isRelevantUrl(url)) {
            return;
          }
          const json: unknown = JSON.parse(this.responseText);
          recordCapture(url, json);
        } catch {
          /* réponse non-JSON */
        }
      });
      originalSend.call(this, body ?? null);
    };
  }

  console.info("[ChatBridge] intercepteur API DeepSeek installé");
}

export function getCapture(): ApiCapture | null {
  return capture;
}

export function clearCapture(): void {
  capture = null;
}

/**
 * Attend qu'une capture apparaisse, ou expire après `timeoutMs`.
 */
export async function waitForCapture(
  timeoutMs: number,
): Promise<ApiCapture | null> {
  if (timeoutMs <= 0) {
    return capture;
  }
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (capture !== null) {
      return capture;
    }
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 200);
    });
  }
  return capture;
}

/**
 * Réservé aux tests : réinitialise l'état du module et restaure fetch.
 */
export function __resetInterceptorForTests(): void {
  installed = false;
  capture = null;
  if (originalFetch !== null) {
    window.fetch = originalFetch;
    originalFetch = null;
  }
}