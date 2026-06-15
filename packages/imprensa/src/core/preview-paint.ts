import type { ImprensaShikiOptions } from "./shiki";
import { codeToSnippetHtml } from "./snippet-shiki";
import {
  decodePreviewCode64,
  makePreviewIframeDoc,
  type PreviewSandboxConfig,
} from "./preview-iframe";

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function escapeHtmlAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export async function buildPreviewWrapperInnerHtml(
  code: string,
  options: {
    shiki?: ImprensaShikiOptions;
    preview?: PreviewSandboxConfig;
    lang?: string;
  },
) {
  const lang = options.lang ?? "tsx";
  const codeBlock =
    options.shiki === false
      ? `<pre class="rounded-lg bg-areia-surface-muted border border-areia-border p-4 overflow-x-auto text-sm"><code>${code
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")}</code></pre>`
      : await codeToSnippetHtml(code, lang, options.shiki).then((html) =>
          html.replace("data-imprensa-snippet", "data-imprensa-preview-code"),
        );

  const srcdoc = makePreviewIframeDoc(code, options.preview ?? {});
  const iframe = `<iframe class="rounded-lg border border-areia-border w-full min-h-32" sandbox="allow-scripts allow-same-origin" srcdoc="${escapeHtmlAttr(srcdoc)}"></iframe>`;

  return `${codeBlock}${iframe}`;
}

/** Replace empty `.preview-wrapper` slots in MDX SSR HTML (prerender + client MDX load). */
export async function paintPreviewSlotsInHtml(
  html: string,
  options: {
    shiki?: ImprensaShikiOptions;
    preview?: PreviewSandboxConfig;
  },
) {
  const slotRe =
    /(<div data-ilha-slot="[^"]*" data-ilha-props=(?:'([^']*)'|"([^"]*)")>)(<div class="[^"]*preview-wrapper[^"]*"><\/div>)(<\/div>)/g;

  let out = html;
  const matches = [...html.matchAll(slotRe)];
  for (const match of matches) {
    const propsRaw = match[2] ?? match[3];
    if (!propsRaw) continue;
    try {
      const props = JSON.parse(decodeHtmlEntities(propsRaw)) as { code64?: string };
      if (typeof props.code64 !== "string") continue;
      const code = decodePreviewCode64(props.code64);
      let inner: string;
      try {
        inner = await buildPreviewWrapperInnerHtml(code, options);
      } catch {
        inner = await buildPreviewWrapperInnerHtml(code, { ...options, shiki: false });
      }
      const painted = `<div class="not-prose flex flex-col gap-4 preview-wrapper">${inner}</div>`;
      out = out.replace(match[0], `${match[1]}${painted}${match[5]}`);
    } catch {
      // keep slot — client activatePreviewSlots will try again
    }
  }
  return out;
}

function textFromPlainPre(preHtml: string) {
  const inner = preHtml.match(/<code[^>]*>([\s\S]*?)<\/code>/i)?.[1] ?? "";
  return inner
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"');
}

const FILLED_PREVIEW_RE =
  /(<div class="[^"]*preview-wrapper[^"]*"[^>]*>)(\s*<pre[\s\S]*?<\/pre>)(\s*<iframe[\s\S]*?<\/iframe>\s*<\/div>)/g;

/** Preview island shell from static prerender (plain `<pre>` inside slot). */
const ILHA_PREVIEW_SLOT_RE =
  /(<div data-ilha-slot="[^"]*" data-ilha-props=(?:'[^']*'|"[^"]*")>\s*)(<div class="[^"]*preview-wrapper[^"]*"[^>]*>\s*<pre[\s\S]*?<\/pre>\s*<iframe[\s\S]*?<\/iframe>\s*<\/div>)(\s*<\/div>)/g;

function plainPreviewPreInWrapper(wrapperHtml: string): string | undefined {
  const m = wrapperHtml.match(
    /<div class="[^"]*preview-wrapper[^"]*"[^>]*>\s*(<pre[\s\S]*?<\/pre>)\s*<iframe/i,
  );
  return m?.[1];
}

async function paintOnePreviewPre(
  preHtml: string,
  options: {
    shiki?: ImprensaShikiOptions;
    preview?: PreviewSandboxConfig;
    lang?: string;
  },
): Promise<string | undefined> {
  if (preHtml.includes("shiki")) return undefined;
  const code = textFromPlainPre(preHtml);
  if (!code.trim()) return undefined;
  try {
    const inner = await buildPreviewWrapperInnerHtml(code, options);
    const iframeIdx = inner.indexOf("<iframe");
    return iframeIdx >= 0 ? inner.slice(0, iframeIdx) : inner;
  } catch {
    return undefined;
  }
}

/** Upgrade plain `<pre>` inside mounted preview wrappers (SSR HTML from `<Preview />`). */
export async function paintFilledPreviewWrappersInHtml(
  html: string,
  options: {
    shiki?: ImprensaShikiOptions;
    preview?: PreviewSandboxConfig;
    lang?: string;
  },
) {
  if (options.shiki === false) return html;
  let out = html;

  for (const match of out.matchAll(FILLED_PREVIEW_RE)) {
    const preHtml = match[2] ?? "";
    const codeBlock = await paintOnePreviewPre(preHtml, options);
    if (!codeBlock) continue;
    out = out.replace(match[0], `${match[1]}${codeBlock}${match[3]}`);
  }

  for (const match of out.matchAll(ILHA_PREVIEW_SLOT_RE)) {
    const wrapper = match[2] ?? "";
    const preHtml = plainPreviewPreInWrapper(wrapper);
    if (!preHtml) continue;
    const codeBlock = await paintOnePreviewPre(preHtml, options);
    if (!codeBlock) continue;
    const iframePart = wrapper.slice(wrapper.indexOf("<iframe"));
    const newWrapper = `<div class="not-prose flex flex-col gap-4 preview-wrapper" data-imprensa-preview-mounted="1">${codeBlock}${iframePart}`;
    out = out.replace(match[0], `${match[1]}${newWrapper}${match[3]}`);
  }

  return out;
}

/** True when cached MDX HTML still has an un-highlighted preview code block. */
export function mdxHtmlNeedsPreviewShiki(html: string): boolean {
  if (!html.includes("preview-wrapper")) return false;
  for (const match of html.matchAll(FILLED_PREVIEW_RE)) {
    const pre = match[2] ?? "";
    if (pre && !pre.includes("shiki")) return true;
  }
  for (const match of html.matchAll(ILHA_PREVIEW_SLOT_RE)) {
    const pre = plainPreviewPreInWrapper(match[2] ?? "");
    if (pre && !pre.includes("shiki")) return true;
  }
  return false;
}

const PREVIEW_CODE_WRAP_CLASS =
  "max-w-full overflow-x-auto rounded-xl border border-areia-border text-sm [&_pre]:min-w-max [&_pre]:!p-4 [&_pre]:!m-0";

/** Browser-only: Shiki-highlight preview `<pre>` blocks inside MDX HTML strings (dev `loadMdxHtml`). */
export async function paintFilledPreviewWrappersInBrowser(
  html: string,
  themes: { light: string; dark: string },
): Promise<string> {
  if (typeof window === "undefined") return html;
  if (!html.includes("preview-wrapper")) return html;

  let out = html;
  const matches = [...html.matchAll(FILLED_PREVIEW_RE)];
  if (matches.length === 0) return html;

  const { shiki } = await import("imprensa/shiki");
  await shiki.loadLanguage("tsx");

  for (const match of matches) {
    const preHtml = match[2] ?? "";
    if (preHtml.includes("shiki")) continue;
    const code = textFromPlainPre(preHtml);
    if (!code.trim()) continue;
    const inner = shiki.codeToHtml(code, { lang: "tsx", themes });
    const codeBlock = `<div class="${PREVIEW_CODE_WRAP_CLASS}" data-imprensa-preview-code>${inner}</div>`;
    out = out.replace(match[0], `${match[1]}${codeBlock}${match[3]}`);
  }
  return out;
}
