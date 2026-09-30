export const PANEL_CSS = `
  :host {
    all: initial;
  }
  .cb-root {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    line-height: 1.4;
    color: #f1f5f9;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
    padding: 14px 16px;
    width: 260px;
    box-sizing: border-box;
  }
  .cb-title {
    font-weight: 600;
    font-size: 14px;
    margin: 0 0 10px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .cb-badge {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 6px;
    background: #0ea5e9;
    color: #0f172a;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.03em;
  }
  .cb-btn {
    width: 100%;
    padding: 9px 12px;
    border: none;
    border-radius: 8px;
    background: #0ea5e9;
    color: #ffffff;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .cb-btn:hover:not(:disabled) {
    background: #38bdf8;
  }
      .cb-btn--secondary {
    margin-top: 8px;
    background: #334155;
    color: #e2e8f0;
  }
  .cb-btn--secondary:hover:not(:disabled) {
    background: #475569;
  }
    .cb-checkbox-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #cbd5e1;
    margin: 8px 0;
    cursor: pointer;
  }  
  .cb-btn:disabled {
    background: #475569;
    cursor: not-allowed;
    opacity: 0.7;
  }
  .cb-status {
    margin-top: 10px;
    font-size: 12px;
    color: #cbd5e1;
    min-height: 1.2em;
    word-break: break-word;
  }
  .cb-status--error {
    color: #fca5a5;
  }
  .cb-status--success {
    color: #86efac;
  }
`;