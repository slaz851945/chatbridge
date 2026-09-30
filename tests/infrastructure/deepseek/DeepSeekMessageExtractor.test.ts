// @vitest-environment jsdom
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { DeepSeekMessageExtractor } from "@infrastructure/deepseek/DeepSeekMessageExtractor.js";

function doc(html: string): Document {
  return new JSDOM(
    `<!DOCTYPE html><html><body>${html}</body></html>`,
  ).window.document;
}

describe("DeepSeekMessageExtractor", () => {
  it("retourne [] pour un document vide", () => {
    const extractor = new DeepSeekMessageExtractor({ root: doc("") });
    expect(extractor.extract()).toEqual([]);
  });

  it("extrait un message assistant simple", () => {
    const extractor = new DeepSeekMessageExtractor({
      root: doc(`
        <div class="ds-message _63c77b1">
          <div class="ds-markdown ds-assistant-message-main-content">Réponse</div>
        </div>
      `),
    });
    const msgs = extractor.extract();
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({ role: "assistant", content: "Réponse", thinking: null });
  });

  it("extrait un message user textuel", () => {
    const extractor = new DeepSeekMessageExtractor({
      root: doc(`
        <div class="d29f3d7d ds-message _63c77b1">
          <div class="fbb737a4">Ma question</div>
        </div>
      `),
    });
    const msgs = extractor.extract();
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({ role: "user", content: "Ma question" });
  });

  it("extrait un bloc thinking et retire le préfixe 'Thought for X seconds'", () => {
    const extractor = new DeepSeekMessageExtractor({
      root: doc(`
        <div class="ds-message _63c77b1">
          <div class="_74c0879">Thought for 5 seconds Voici ma réflexion</div>
          <div class="ds-markdown ds-assistant-message-main-content">Réponse</div>
        </div>
      `),
    });
    const msgs = extractor.extract();
    expect(msgs[0]?.thinking).toBe("Voici ma réflexion");
    expect(msgs[0]?.content).toBe("Réponse");
  });

  it("détecte un fichier joint sur un message user", () => {
    const extractor = new DeepSeekMessageExtractor({
      root: doc(`
        <div class="d29f3d7d ds-message _63c77b1">
          <div class="eafda4ae">
            <div class="e70accd6">rapport.txt</div>
          </div>
        </div>
      `),
    });
    const msgs = extractor.extract();
    expect(msgs).toHaveLength(1);
    expect(msgs[0]?.attachments).toHaveLength(1);
    expect(msgs[0]?.attachments[0]?.name).toBe("rapport.txt");
  });

  it("ignore les blocs ds-message sans contenu ni pièce jointe", () => {
    const extractor = new DeepSeekMessageExtractor({
      root: doc(`
        <div class="ds-message _63c77b1"></div>
        <div class="ds-message _63c77b1">
          <div class="ds-markdown ds-assistant-message-main-content">Ok</div>
        </div>
      `),
    });
    expect(extractor.extract()).toHaveLength(1);
  });

  it("assigne des index séquentiels", () => {
    const extractor = new DeepSeekMessageExtractor({
      root: doc(`
        <div class="d29f3d7d ds-message"><div class="fbb737a4">A</div></div>
        <div class="ds-message"><div class="ds-markdown ds-assistant-message-main-content">B</div></div>
      `),
    });
    const msgs = extractor.extract();
    expect(msgs.map((m) => m.index)).toEqual([0, 1]);
    expect(msgs.map((m) => m.role)).toEqual(["user", "assistant"]);
  });

  it("thinking seul (sans contenu) est conservé", () => {
    const extractor = new DeepSeekMessageExtractor({
      root: doc(`
        <div class="ds-message _63c77b1">
          <div class="_74c0879">Thought for 1 second Juste une pensée</div>
        </div>
      `),
    });
    const msgs = extractor.extract();
    expect(msgs).toHaveLength(1);
    expect(msgs[0]?.thinking).toBe("Juste une pensée");
    expect(msgs[0]?.content).toBe("");
  });

  it("préfixe 'Thought for X minutes' est aussi retiré", () => {
    const extractor = new DeepSeekMessageExtractor({
      root: doc(`
        <div class="ds-message _63c77b1">
          <div class="_74c0879">Thought for 2 minutes Longue réflexion</div>
          <div class="ds-markdown ds-assistant-message-main-content">R</div>
        </div>
      `),
    });
    expect(extractor.extract()[0]?.thinking).toBe("Longue réflexion");
  });

  it("user avec texte ET pièce jointe", () => {
    const extractor = new DeepSeekMessageExtractor({
      root: doc(`
        <div class="d29f3d7d ds-message">
          <div class="fbb737a4">Voici le fichier</div>
          <div class="eafda4ae"><div class="e70accd6">data.csv</div></div>
        </div>
      `),
    });
    const msgs = extractor.extract();
    expect(msgs[0]?.content).toBe("Voici le fichier");
    expect(msgs[0]?.attachments[0]?.name).toBe("data.csv");
  });
});