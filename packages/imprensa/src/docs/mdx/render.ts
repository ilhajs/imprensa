import { raw } from "ilha";
import type { ResolvableHead as Head } from "unhead/types";
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

export async function renderMdx(url: string) {
  const loaded = await loadMdxModule(url);
  if (!loaded) return undefined;

  return {
    html: escapeUnsafeHtmlScriptTags(toHtml(loaded.mod.default({}))),
    path: loaded.pathname,
  };
}

export async function loadMdxHtml(path: string) {
  const cached = getPrerenderedMdxHtml() ?? getClientPrerenderedMdxHtml(path);
  if (cached) return raw(cached);
  const content = await renderMdxContent(path);
  return content ? raw(escapeUnsafeHtmlScriptTags(toHtml(content))) : null;
}

export function getMdxContent(path: string) {
  const cached = getPrerenderedMdxHtml() ?? getClientPrerenderedMdxHtml(path);
  return cached ? raw(cached) : undefined;
}
