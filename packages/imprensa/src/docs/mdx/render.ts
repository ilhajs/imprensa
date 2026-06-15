import { raw } from "ilha";
import type { ResolvableHead as Head } from "unhead/types";
import {
  mdxHtmlNeedsPreviewShiki,
  paintFilledPreviewWrappersInBrowser,
  paintFilledPreviewWrappersInHtml,
  paintPreviewSlotsInHtml,
} from "../../core/preview-paint";
import type { MdxContent } from "./types";
import { mdxPages } from "./routes";

let prerenderedMdxHtml: string | undefined;

function toHtml(content: MdxContent) {
  return typeof content === "string" ? content : content.value;
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

type PrerenderDataPayload = {
  mdxHtml?: string;
  mdxHtmlBase64?: string;
  mdxPath?: string;
};

export function setPrerenderedMdxHtml(html: string | undefined) {
  prerenderedMdxHtml = html;
}

export function getPrerenderedMdxHtml() {
  return prerenderedMdxHtml;
}

export function getClientPrerenderedMdxHtml(path: string) {
  if (typeof document === "undefined") return undefined;

  const data = document.getElementById("prerender-data")?.textContent;
  if (!data) return undefined;

  try {
    const parsed = JSON.parse(data) as PrerenderDataPayload;
    const normalizedPath = path.replace(/\/$/, "") || "/";
    if (parsed.mdxPath !== normalizedPath) return undefined;
    if (typeof parsed.mdxHtmlBase64 === "string") return decodeBase64(parsed.mdxHtmlBase64);
    return typeof parsed.mdxHtml === "string" ? parsed.mdxHtml : undefined;
  } catch {
    return undefined;
  }
}

function normalizePath(url: string) {
  return new URL(url, "http://localhost").pathname.replace(/\/$/, "") || "/";
}

async function loadMdxModule(url: string) {
  const pathname = normalizePath(url);
  const loader = mdxPages.get(pathname);
  return loader ? { pathname, mod: await loader() } : undefined;
}

export async function renderMdxContent(url: string) {
  return (await loadMdxModule(url))?.mod.default({});
}

export async function getMdxHead(url: string): Promise<Head | undefined> {
  return (await loadMdxModule(url))?.mod.head;
}

function escapeUnsafeHtmlScriptTags(html: string) {
  return html.replace(/<script/gi, "&lt;script").replace(/<\/script>/gi, "&lt;/script&gt;");
}

async function paintMdxHtml(html: string) {
  let painted = html;
  try {
    const config = await import("imprensa/config");
    const paintOpts = { shiki: config.shiki, preview: config.preview };
    painted = await paintPreviewSlotsInHtml(html, paintOpts);
    painted = await paintFilledPreviewWrappersInHtml(painted, paintOpts);
  } catch {
    try {
      painted = await paintPreviewSlotsInHtml(html, { shiki: false, preview: {} });
    } catch {
      // leave html unchanged; client activator handles legacy empty slots
    }
    try {
      painted = await paintFilledPreviewWrappersInHtml(painted, { shiki: false, preview: {} });
    } catch {
      // client DocPreviewMountHook upgrades via imprensa/shiki
    }
  }
  return escapeUnsafeHtmlScriptTags(painted);
}

export async function renderMdx(url: string) {
  const loaded = await loadMdxModule(url);
  if (!loaded) return undefined;

  const rawHtml = toHtml(loaded.mod.default({}));
  return {
    html: await paintMdxHtml(rawHtml),
    path: loaded.pathname,
  };
}

async function paintMdxHtmlForBrowser(html: string) {
  const config = await import("imprensa/config");
  let painted = html;
  try {
    painted = await paintFilledPreviewWrappersInBrowser(painted, config.shikiThemes);
  } catch (err) {
    console.error("[imprensa] preview Shiki (browser) failed:", err);
  }
  return escapeUnsafeHtmlScriptTags(painted);
}

/** Client-only: load doc HTML and apply preview Shiki via `imprensa/shiki`. */
export async function loadMdxHtml(path: string) {
  const cached = getPrerenderedMdxHtml() ?? getClientPrerenderedMdxHtml(path);
  const content = cached ?? (await renderMdxContent(path));
  if (!content) return null;
  const html = typeof content === "string" ? content : toHtml(content);
  return raw(await paintMdxHtmlForBrowser(html));
}

export function getMdxContent(path: string) {
  const cached = getPrerenderedMdxHtml() ?? getClientPrerenderedMdxHtml(path);
  return cached ? raw(cached) : undefined;
}

/** Use async `loadMdxHtml` when prerender blob has plain preview `<pre>` (prod static). */
export function getMdxContentNeedsAsyncPaint(path: string): boolean {
  const cached = getPrerenderedMdxHtml() ?? getClientPrerenderedMdxHtml(path);
  return cached ? mdxHtmlNeedsPreviewShiki(cached) : false;
}
