import type { Message } from "@domain/models/index.js";
import type { Clock } from "./clock.js";
import type { DeepSeekMessageExtractor } from "./DeepSeekMessageExtractor.js";

export interface VirtualListExtractorDeps {
  readonly getScrollContainer: () => HTMLElement | null;
  readonly extractor: DeepSeekMessageExtractor;
  readonly clock: Clock;
}

export interface VirtualListExtractorOptions {
  readonly scrollStepPx?: number;
  readonly scrollDelayMs?: number;
  readonly maxIterations?: number;
  readonly noProgressThreshold?: number;
  readonly onProgress?: (info: {
    messagesFound: number;
    iteration: number;
    scrollTop: number;
    scrollHeight: number;
  }) => void;
}

// const DEFAULTS = {
//   scrollStepPx: 250,       // pas de base
//   scrollStepFastPx: 1200,  // pas accéléré (zone morte)
//   scrollStepTurboPx: 3000, // pas turbo (zone morte prolongée)
//   scrollDelayMs: 60,
//   maxIterations: 30000,
//   noProgressThreshold: 200,
// } as const;

const DEFAULTS = {
  scrollStepPx: 900,       // était 250 — on avance 3.6× plus vite
  scrollStepFastPx: 900,   // pas de ralentissement — même valeur
  scrollStepTurboPx: 900,  // pas de ralentissement — même valeur
  scrollDelayMs: 50,       // était 60 — léger gain
  maxIterations: 100000,   // était 30000 — plus de plafond
  noProgressThreshold: 1000, // était 200 — quasi jamais atteint
} as const;



/**
 * Capture TOUS les messages d'une liste virtualisée DeepSeek.
 *
 * Amélioration majeure : pas adaptatif.
 *  - 0-15 itérations sans nouveau message  → pas de 250 px (précis)
 *  - 16-40 itérations sans nouveau message → pas de 1200 px (accéléré)
 *  - 40+ itérations sans nouveau message   → pas de 3000 px (turbo)
 *  - Dès qu'un nouveau message arrive, retour au pas de base.
 *
 * Ça permet de traverser rapidement les blocs de code énormes
 * (un seul message peut faire 10 000 px) sans rater les zones denses.
 */
export class VirtualListExtractor {
  private readonly deps: VirtualListExtractorDeps;

  constructor(deps: VirtualListExtractorDeps) {
    this.deps = deps;
  }

  async captureAll(
    options: VirtualListExtractorOptions = {},
  ): Promise<readonly Message[]> {
    const baseStep = options.scrollStepPx ?? DEFAULTS.scrollStepPx;
    const fastStep = DEFAULTS.scrollStepFastPx;
    const turboStep = DEFAULTS.scrollStepTurboPx;
    const delay = options.scrollDelayMs ?? DEFAULTS.scrollDelayMs;
    const maxIter = options.maxIterations ?? DEFAULTS.maxIterations;
    const noProgressThreshold =
      options.noProgressThreshold ?? DEFAULTS.noProgressThreshold;

    const first = this.deps.getScrollContainer();
    if (first === null) {
      return [];
    }
    const originalScrollTop = first.scrollTop;

    const seen = new Map<string, Omit<Message, "index">>();
    let consecutiveNoProgress = 0;
    let bottomConfirmations = 0;

    try {
      await this.scrollToTop(delay);

      let iteration = 0;
      let lastLog = 0;

      while (iteration < maxIter) {
        iteration += 1;
        const container = this.deps.getScrollContainer();
        if (container === null) {
          console.info("[ChatBridge] conteneur disparu — arrêt");
          break;
        }

        const added = this.captureOnce(seen);
        if (added > 0) {
          consecutiveNoProgress = 0;
        } else {
          consecutiveNoProgress += 1;
        }

        options.onProgress?.({
          messagesFound: seen.size,
          iteration,
          scrollTop: container.scrollTop,
          scrollHeight: container.scrollHeight,
        });

        if (iteration - lastLog >= 10) {
          lastLog = iteration;
          const step =
            consecutiveNoProgress > 40
              ? turboStep
              : consecutiveNoProgress > 15
                ? fastStep
                : baseStep;
          console.info(
            `[ChatBridge] iter ${String(iteration)} — ${String(seen.size)} msgs (+${String(added)}) — pas ${String(step)}px — ${String(Math.round(container.scrollTop))}/${String(container.scrollHeight)}px`,
          );
        }

        if (consecutiveNoProgress >= noProgressThreshold) {
          console.info(
            `[ChatBridge] stop : ${String(consecutiveNoProgress)} itérations sans nouveau message`,
          );
          break;
        }

        const atBottom =
          container.scrollTop + container.clientHeight >=
          container.scrollHeight - 8;

        if (atBottom) {
          const beforeHeight = container.scrollHeight;
          await this.deps.clock.sleep(1500);
          const refreshed = this.deps.getScrollContainer();
          if (refreshed === null) {
            break;
          }
          this.captureOnce(seen);
          if (refreshed.scrollHeight > beforeHeight + 4) {
            console.info(
              `[ChatBridge] bas atteint mais contenu supplémentaire chargé — on continue`,
            );
            bottomConfirmations = 0;
            continue;
          }
          bottomConfirmations += 1;
          if (bottomConfirmations >= 3) {
            console.info(
              `[ChatBridge] stop : vrai bas confirmé (scrollHeight stable)`,
            );
            break;
          }
          await this.deps.clock.sleep(1000);
          continue;
        }

        bottomConfirmations = 0;
        const step =
          consecutiveNoProgress > 40
            ? turboStep
            : consecutiveNoProgress > 15
              ? fastStep
              : baseStep;
        container.scrollTop = container.scrollTop + step;
        await this.deps.clock.sleep(delay);
      }
    } finally {
      const finalContainer = this.deps.getScrollContainer();
      if (finalContainer !== null) {
        finalContainer.scrollTop = originalScrollTop;
      }
    }

    return Array.from(seen.values()).map((m, i) => ({ ...m, index: i }));
  }

  private async scrollToTop(delay: number): Promise<void> {
    let previousHeight = -1;
    let stableCount = 0;
    for (let i = 0; i < 200; i += 1) {
      const container = this.deps.getScrollContainer();
      if (container === null) {
        return;
      }
      const target = Math.max(0, container.scrollTop - 3000);
      container.scrollTop = target;
      await this.deps.clock.sleep(delay);

      const h = container.scrollHeight;
      const atTop = container.scrollTop === 0;
      if (atTop && h === previousHeight) {
        stableCount += 1;
        if (stableCount >= 3) {
          console.info(
            `[ChatBridge] haut stable à ${String(h)}px après ${String(i)} itérations`,
          );
          return;
        }
      } else {
        stableCount = 0;
      }
      previousHeight = h;

      if (atTop) {
        await this.deps.clock.sleep(delay * 3);
      }
    }
  }

  private captureOnce(seen: Map<string, Omit<Message, "index">>): number {
    const messages = this.deps.extractor.extract();
    let added = 0;
    for (const m of messages) {
      const key = dedupKey(m);
      if (!seen.has(key)) {
        seen.set(key, {
          role: m.role,
          timestamp: m.timestamp,
          content: m.content,
          thinking: m.thinking,
          attachments: m.attachments,
        });
        added += 1;
      }
    }
    return added;
  }
}

function dedupKey(m: Message): string {
  const content = m.content;
  const thinking = m.thinking ?? "";
  return `${m.role}|${String(content.length)}|${content}|${String(thinking.length)}|${thinking}|${String(m.attachments.length)}`;
}