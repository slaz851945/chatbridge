/**
 * Helpers DOM — parcours de sélecteurs avec fallback.
 * Le premier sélecteur qui matche gagne ; sinon chaîne vide.
 */
export function queryFirst(
  root: ParentNode,
  selectors: readonly string[],
): Element | null {
  for (const sel of selectors) {
    const el = root.querySelector(sel);
    if (el !== null) {
      return el;
    }
  }
  return null;
}

export function queryAll(
  root: ParentNode,
  selectors: readonly string[],
): readonly Element[] {
  for (const sel of selectors) {
    const els = root.querySelectorAll(sel);
    if (els.length > 0) {
      return Array.from(els);
    }
  }
  return [];
}

export function textOf(el: Element | null): string {
  if (el === null) {
    return "";
  }
  return el.textContent.trim();
}
