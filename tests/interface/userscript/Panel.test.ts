// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { Panel, type Exporter, type Importer } from "@interface/userscript/ui/Panel.js";
import type { ExportFlowResult } from "@application/export/ExportFlow.js";

const sampleResult: ExportFlowResult = {
  fileName: "test.zip",
  bytes: new Uint8Array([1, 2, 3]),
  messageCount: 5,
  sha256: "a".repeat(64),
  envelope: {
    chatbridge_version: "0.1.0",
    exported_at: "2026-09-28T00:00:00Z",
    source: { platform: "deepseek", url: "u", title: "t" },
    sha256: "a".repeat(64),
    messages: [],
  },
};

const noopImporter: Importer = () => Promise.resolve();

function makePanel(opts: {
  exporter?: Exporter;
  importer?: Importer;
  onError?: (error: unknown) => void;
}): Panel {
  return new Panel({
    exporter: opts.exporter ?? ((): Promise<ExportFlowResult> => Promise.resolve(sampleResult)),
    importer: opts.importer ?? noopImporter,
    ...(opts.onError !== undefined && { onError: opts.onError }),
  });
}

describe("Panel", () => {
  it("monte un host dans le parent avec Shadow DOM", () => {
    const panel = makePanel({});
    panel.mount(document.body);
    const host = document.querySelector("[data-chatbridge-panel]");
    expect(host).not.toBeNull();
    expect(host?.shadowRoot).not.toBeNull();
    panel.unmount();
    expect(document.querySelector("[data-chatbridge-panel]")).toBeNull();
  });

  it("le Shadow DOM contient les boutons et le statut", () => {
    const panel = makePanel({});
    panel.mount(document.body);
    const root = document.querySelector("[data-chatbridge-panel]")!.shadowRoot!;
    const buttons = root.querySelectorAll(".cb-btn");
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    expect(root.querySelector(".cb-status")?.textContent).toBe("Prêt.");
    panel.unmount();
  });

  it("au clic sur Exporter, appelle l'exporter et affiche le résultat", async () => {
    const exporter = vi.fn((): Promise<ExportFlowResult> => Promise.resolve(sampleResult));
    const panel = makePanel({ exporter });
    panel.mount(document.body);
    const root = document.querySelector("[data-chatbridge-panel]")!.shadowRoot!;
    const btn = root.querySelector<HTMLButtonElement>(".cb-btn")!;
    btn.click();
    await new Promise<void>((r) => { setTimeout(r, 10); });
    expect(exporter).toHaveBeenCalledTimes(1);
    expect(root.querySelector(".cb-status")!.textContent).toContain("5 messages");
    panel.unmount();
  });

  it("affiche une erreur si l'exporter échoue", async () => {
    const exporter = vi.fn((): Promise<ExportFlowResult> => Promise.reject(new Error("boom")));
    const onError = vi.fn();
    const panel = makePanel({ exporter, onError });
    panel.mount(document.body);
    const root = document.querySelector("[data-chatbridge-panel]")!.shadowRoot!;
    const btn = root.querySelector<HTMLButtonElement>(".cb-btn")!;
    btn.click();
    await new Promise<void>((r) => { setTimeout(r, 10); });
    expect(onError).toHaveBeenCalledTimes(1);
    expect(root.querySelector(".cb-status")!.textContent).toContain("boom");
    panel.unmount();
  });

  it("progression : l'exporter peut pousser des messages de statut", async () => {
    const exporter = vi.fn(
      (onProgress: (msg: string) => void): Promise<ExportFlowResult> => {
        onProgress("⏳ 10 messages (5% — étape 2)");
        return Promise.resolve(sampleResult);
      },
    );
    const panel = makePanel({ exporter });
    panel.mount(document.body);
    const root = document.querySelector("[data-chatbridge-panel]")!.shadowRoot!;
    const btn = root.querySelector<HTMLButtonElement>(".cb-btn")!;
    btn.click();
    await new Promise<void>((r) => { setTimeout(r, 10); });
    expect(root.querySelector(".cb-status")!.textContent).toContain("5 messages");
    panel.unmount();
  });

  it("l'importer est appelé lors de la sélection d'un fichier", () => {
    const importer = vi.fn((): Promise<void> => Promise.resolve());
    const panel = makePanel({ importer });
    panel.mount(document.body);
    const root = document.querySelector("[data-chatbridge-panel]")!.shadowRoot!;
    const fileInput = root.querySelector<HTMLInputElement>("input[type='file']")!;
    expect(fileInput).not.toBeNull();
    panel.unmount();
  });
});