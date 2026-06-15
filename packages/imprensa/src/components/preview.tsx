/** @jsxImportSource ilha */
import ilha, { raw } from "ilha";
import { preview as previewConfig, shikiThemes } from "imprensa/config";
import { decodePreviewCode64, makePreviewIframeDoc } from "../core/preview-iframe";
import type { ImprensaShikiHighlighter } from "../core/shiki-types";

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function escapeHtmlText(code: string) {
  return code.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function escapeHtmlAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function previewWrapperHtml(code: string) {
  const pre = `<pre class="rounded-lg bg-areia-surface-muted border border-areia-border p-4 overflow-x-auto text-sm" data-imprensa-preview-code><code>${escapeHtmlText(code)}</code></pre>`;
  const srcdoc = makePreviewIframeDoc(code, previewConfig);
  const iframe = `<iframe class="rounded-lg border border-areia-border w-full min-h-32" sandbox="allow-scripts allow-same-origin" srcdoc="${escapeHtmlAttr(srcdoc)}"></iframe>`;
  return `<div class="not-prose flex flex-col gap-4 preview-wrapper" data-imprensa-preview-mounted="1">${pre}${iframe}</div>`;
}

function syncPreviewIframeTheme(iframe: HTMLIFrameElement) {
  const syncDark = () => {
    const dark = document.documentElement.classList.contains("dark");
    iframe.contentDocument?.documentElement.classList.toggle("dark", dark);
  };
  syncDark();
  new MutationObserver(syncDark).observe(document.documentElement, {
    attributeFilter: ["class"],
  });
}

function previewCodeFromWrapper(wrapper: HTMLElement): string | undefined {
  const fromEl = wrapper.querySelector("[data-imprensa-preview-code] code, pre code");
  const fromText = fromEl?.textContent?.trim();
  if (fromText) return fromText;

  const host = wrapper.closest("[data-ilha-props]");
  const rawProps = host?.getAttribute("data-ilha-props");
  if (!rawProps) return undefined;
  try {
    let props: { code64?: string };
    try {
      props = JSON.parse(rawProps) as { code64?: string };
    } catch {
      props = JSON.parse(decodeHtmlEntities(rawProps)) as { code64?: string };
    }
    if (typeof props.code64 === "string") return decodePreviewCode64(props.code64);
  } catch {
    // ignore
  }
  return undefined;
}

export function syncPreviewIframesInRoot(root: ParentNode) {
  for (const wrapper of root.querySelectorAll<HTMLElement>(".preview-wrapper")) {
    const iframe = wrapper.querySelector("iframe");
    if (iframe) syncPreviewIframeTheme(iframe);
    const code = previewCodeFromWrapper(wrapper);
    if (code) upgradePreviewShiki(wrapper, code);
  }
}

function upgradePreviewShiki(wrapper: HTMLElement, code: string) {
  if (wrapper.querySelector(".shiki")) return;
  const pre =
    wrapper.querySelector<HTMLElement>("[data-imprensa-preview-code]") ??
    wrapper.querySelector("pre");
  if (!pre) return;

  void import("imprensa/shiki")
    .then(async ({ shiki: clientShiki }) => {
      const previewHighlighter = clientShiki as ImprensaShikiHighlighter;
      await previewHighlighter.loadLanguage("tsx");
      const div = document.createElement("div");
      div.innerHTML = previewHighlighter.codeToHtml(code, {
        lang: "tsx",
        themes: shikiThemes,
      });
      const highlighted = div.firstElementChild;
      if (!highlighted) return;
      highlighted.classList.add(
        "rounded-lg",
        "overflow-hidden",
        "border",
        "border-areia-border",
        "text-sm",
        "max-w-full",
        "overflow-x-auto",
        "[&_pre]:!p-4",
        "[&_pre]:!m-0",
      );
      pre.replaceWith(highlighted);
    })
    .catch((err) => {
      console.error("[imprensa] preview Shiki failed:", err);
    });
}

/** Hydrate legacy empty preview slots inside prerendered MDX HTML. */
export function activatePreviewSlots(root: ParentNode = document) {
  for (const wrapper of root.querySelectorAll<HTMLElement>(".preview-wrapper")) {
    if (wrapper.querySelector("iframe")) {
      wrapper.dataset.imprensaPreviewMounted = "1";
      syncPreviewIframeTheme(wrapper.querySelector("iframe")!);
      const code = previewCodeFromWrapper(wrapper);
      if (code) upgradePreviewShiki(wrapper, code);
      continue;
    }

    const host = wrapper.closest("[data-ilha-props]");
    const rawProps = host?.getAttribute("data-ilha-props");
    if (!rawProps) continue;
    try {
      let props: { code64?: string };
      try {
        props = JSON.parse(rawProps) as { code64?: string };
      } catch {
        props = JSON.parse(decodeHtmlEntities(rawProps)) as { code64?: string };
      }
      if (typeof props.code64 !== "string") continue;
      const code = decodePreviewCode64(props.code64);
      wrapper.outerHTML = previewWrapperHtml(code);
      const next = host?.querySelector(".preview-wrapper");
      if (next) {
        next.dataset.imprensaPreviewMounted = "1";
        const iframe = next.querySelector("iframe");
        if (iframe) syncPreviewIframeTheme(iframe);
        upgradePreviewShiki(next, code);
      }
    } catch {
      // ignore
    }
  }
}

export const Preview = ilha
  .input<{ code64: string }>()
  .onMount(({ host, input }) => {
    const wrapper = host.querySelector<HTMLElement>(".preview-wrapper");
    if (!wrapper) return;
    const code = decodePreviewCode64(input.code64);
    const iframe = wrapper.querySelector("iframe");
    if (iframe) syncPreviewIframeTheme(iframe);
    upgradePreviewShiki(wrapper, code);
  })
  .render(({ input }) => {
    const code = decodePreviewCode64(input.code64);
    return raw(previewWrapperHtml(code));
  });
