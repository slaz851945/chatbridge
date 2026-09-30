/**
 * Déclenche le téléchargement d'un Blob dans le navigateur.
 * Utilise un <a download> invisible — fonctionne dans un userscript.
 */
export function downloadBlob(
  bytes: Uint8Array,
  filename: string,
  mimeType = "application/zip",
): void {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const blob = new Blob([buffer], { type: mimeType });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}