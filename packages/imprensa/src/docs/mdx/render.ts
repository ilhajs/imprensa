import { raw } from "ilha";
import type { ResolvableHead as Head } from "unhead/types";

import { sanitizeMdxHtmlString } from "../../core/sanitize-mdx-html";
import type { MdxContent } from "./types";
import { filePathToRoutePath, mdxIslandSequences, mdxPages } from "./routes";

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
  const entry = [...mdxPages.entries()].find(([path]) => path === pathname);
  if (!entry) return undefined;
  const [path, loader] = entry;
  const filePath = Object.keys(mdxIslandSequences).find((key) => filePathToRoutePath(key) === path);
  return { pathname, filePath, mod: await loader() };
}

function tagMdxIslandSlots(html: string, filePath: string | undefined) {
  if (!filePath) return html;
  const sequence = mdxIslandSequences[filePath];
  if (!sequence?.length) return html;
  let index = 0;
  return html.replace(
    /<div\b(?=[^>]*\bdata-ilha-slot=)(?=[^>]*\bdata-ilha-props=)(?![^>]*\bdata-imprensa-mdx-island=)/g,
    (match) => {
      const key = sequence[index++];
      return key ? `${match} data-imprensa-mdx-island=${JSON.stringify(key)}` : match;
    },
  );
}

export async function renderMdxContent(url: string) {
  const loaded = await loadMdxModule(url);
  if (!loaded) return undefined;
  return sanitizeMdxHtmlString(tagMdxIslandSlots(toHtml(loaded.mod.default({})), loaded.filePath));
}

export async function getMdxHead(url: string): Promise<Head | undefined> {
  return (await loadMdxModule(url))?.mod.head;
}

export async function renderMdx(url: string) {
  const loaded = await loadMdxModule(url);
  if (!loaded) return undefined;

  return {
    html: sanitizeMdxHtmlString(tagMdxIslandSlots(toHtml(loaded.mod.default({})), loaded.filePath)),
    path: loaded.pathname,
  };
}

/** Client-only: load doc HTML. */
export async function loadMdxHtml(path: string) {
  const cached = getPrerenderedMdxHtml() ?? getClientPrerenderedMdxHtml(path);
  const content = cached ?? (await renderMdxContent(path));
  if (!content) return null;
  const html = typeof content === "string" ? content : toHtml(content);
  return raw(sanitizeMdxHtmlString(html));
}

export function getMdxContent(path: string) {
  const cached = getPrerenderedMdxHtml() ?? getClientPrerenderedMdxHtml(path);
  return cached ? raw(sanitizeMdxHtmlString(cached)) : undefined;
}

export function getMdxContentNeedsAsyncPaint(_path: string): boolean {
  return false;
}
