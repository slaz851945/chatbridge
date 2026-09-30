import type { ExportFlowResult } from "@application/export/ExportFlow.js";
import { PANEL_CSS } from "./styles.js";

export type ExporterProgress = (message: string) => void;
export type Exporter = (onProgress: ExporterProgress) => Promise<ExportFlowResult>;
export type Importer = (
  file: File,
  options: { compact: boolean },
  onProgress: ExporterProgress,
) => Promise<void>;

export interface PanelOptions {
  readonly exporter: Exporter;
  readonly importer: Importer;
  readonly onError?: (error: unknown) => void;
}

export class Panel {
  private readonly opts: PanelOptions;
  private readonly host: HTMLElement;
  private readonly root: ShadowRoot;
  private readonly exportBtn: HTMLButtonElement;
  private readonly importBtn: HTMLButtonElement;
  private readonly fileInput: HTMLInputElement;
  private readonly compactCheckbox: HTMLInputElement;
  private readonly status: HTMLDivElement;
  private busy = false;

  constructor(opts: PanelOptions) {
    this.opts = opts;
    this.host = document.createElement("div");
    this.host.setAttribute("data-chatbridge-panel", "true");
    this.root = this.host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = PANEL_CSS;
    this.root.appendChild(style);

    const container = document.createElement("div");
    container.className = "cb-root";

    const title = document.createElement("div");
    title.className = "cb-title";
    const badge = document.createElement("span");
    badge.className = "cb-badge";
    badge.textContent = "CB";
    const titleText = document.createElement("span");
    titleText.textContent = "ChatBridge";
    title.appendChild(badge);
    title.appendChild(titleText);
    container.appendChild(title);

    this.exportBtn = document.createElement("button");
    this.exportBtn.className = "cb-btn";
    this.exportBtn.type = "button";
    this.exportBtn.textContent = "Exporter ce chat";
    this.exportBtn.addEventListener("click", () => {
      void this.handleExport();
    });
    container.appendChild(this.exportBtn);

    // Case « Mode compact »
    const compactLabel = document.createElement("label");
    compactLabel.className = "cb-checkbox-row";
    this.compactCheckbox = document.createElement("input");
    this.compactCheckbox.type = "checkbox";
    this.compactCheckbox.id = "cb-compact";
    const compactText = document.createElement("span");
    compactText.textContent = "Mode compact (assistant tronqué)";
    compactLabel.appendChild(this.compactCheckbox);
    compactLabel.appendChild(compactText);
    container.appendChild(compactLabel);

    this.importBtn = document.createElement("button");
    this.importBtn.className = "cb-btn cb-btn--secondary";
    this.importBtn.type = "button";
    this.importBtn.textContent = "Importer un chat";
    this.importBtn.addEventListener("click", () => {
      this.fileInput.click();
    });
    container.appendChild(this.importBtn);

    this.fileInput = document.createElement("input");
    this.fileInput.type = "file";
    this.fileInput.accept = ".zip,.json,application/zip,application/json";
    this.fileInput.style.display = "none";
    this.fileInput.addEventListener("change", () => {
      void this.handleImport();
    });
    container.appendChild(this.fileInput);

    this.status = document.createElement("div");
    this.status.className = "cb-status";
    this.status.textContent = "Prêt.";
    container.appendChild(this.status);

    this.root.appendChild(container);
  }

  mount(parent: Element): void {
    parent.appendChild(this.host);
  }

  unmount(): void {
    this.host.remove();
  }

  private async handleExport(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.setBusy(true);
    this.setStatus("Extraction en cours…");
    try {
      const result = await this.opts.exporter((msg) => {
        this.setStatus(msg);
      });
      this.setStatus(
        `✅ ${String(result.messageCount)} messages — ${result.fileName}`,
        "success",
      );
    } catch (error) {
      this.reportError(error);
    } finally {
      this.busy = false;
      this.setBusy(false);
    }
  }

  private async handleImport(): Promise<void> {
    const file = this.fileInput.files?.[0];
    if (file === undefined) return;
    if (this.busy) return;
    this.busy = true;
    this.setBusy(true);
    const compact = this.compactCheckbox.checked;
    this.setStatus(`Import de ${file.name}${compact ? " (compact)" : ""}…`);
    try {
      await this.opts.importer(
        file,
        { compact },
        (msg) => {
          this.setStatus(msg);
        },
      );
      this.setStatus("✅ Import terminé", "success");
    } catch (error) {
      this.reportError(error);
    } finally {
      this.busy = false;
      this.setBusy(false);
      this.fileInput.value = "";
    }
  }

  private setBusy(busy: boolean): void {
    this.exportBtn.disabled = busy;
    this.importBtn.disabled = busy;
  }

  private reportError(error: unknown): void {
    this.setStatus(
      `❌ ${error instanceof Error ? error.message : String(error)}`,
      "error",
    );
    this.opts.onError?.(error);
  }

  private setStatus(text: string, variant?: "success" | "error"): void {
    this.status.textContent = text;
    this.status.className = "cb-status";
    if (variant === "success") this.status.classList.add("cb-status--success");
    else if (variant === "error") this.status.classList.add("cb-status--error");
  }
}