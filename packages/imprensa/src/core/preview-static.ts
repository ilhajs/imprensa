import { makePreviewIframeDoc } from "./preview-iframe";

function escapeHtmlText(code: string) {
  return code.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function escapeHtmlAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** Fallback preview markup (plain code + iframe) when Shiki paint fails. */
export function buildPreviewStaticHtml(
  code: string,
  preview?: { importmap?: string; head?: string },
) {
  const pre = `<pre class="rounded-lg bg-areia-surface-muted border border-areia-border p-4 overflow-x-auto text-sm" data-imprensa-preview-code><code>${escapeHtmlText(code)}</code></pre>`;
  const srcdoc = makePreviewIframeDoc(code, preview ?? {});
  const iframe = `<iframe class="rounded-lg border border-areia-border w-full min-h-32" sandbox="allow-scripts allow-same-origin" srcdoc="${escapeHtmlAttr(srcdoc)}"></iframe>`;
  return `<div class="not-prose flex flex-col gap-4 preview-wrapper" data-imprensa-preview-mounted="1">${pre}${iframe}</div>`;
}
