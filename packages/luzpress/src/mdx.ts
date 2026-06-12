import type { RawHtml } from "ilha";
import { raw } from "ilha";

let prerenderedMdxHtml: string | undefined;

type MdxContent = string | RawHtml;

import type { Head } from "unhead";

type MdxModule = {
  default: (props: Record<string, unknown>) => MdxContent;
  head?: Head;
};

export type ContentMeta = {
  title: string;
  description?: string;
  order?: number;
  priority: number;
  section?: string;
  badge?: string;
  draft?: boolean;
  hidden?: boolean;
  tags: string[];
};

export type ContentTreeNode = {
  title: string;
  path?: string;
  priority: number;
  order?: number;
  description?: string;
  badge?: string;
  children: ContentTreeNode[];
};

export type SearchDocument = {
  id: string;
  title: string;
  path: string;
  text: string;
  description?: string;
  tags: string[];
};

export const articleClass = [
  "flex-1 prose w-full max-w-none",
  "text-areia-default",
  "[--tw-prose-body:var(--areia-text-default)]",
  "[--tw-prose-headings:var(--areia-text-strong)]",
  "[--tw-prose-lead:var(--areia-text-subtle)]",
  "[--tw-prose-links:var(--areia-primary)]",
  "[--tw-prose-bold:var(--areia-text-strong)]",
  "[--tw-prose-counters:var(--areia-text-muted)]",
  "[--tw-prose-bullets:var(--areia-text-muted)]",
  "[--tw-prose-hr:var(--areia-divider)]",
  "[--tw-prose-quotes:var(--areia-text-strong)]",
  "[--tw-prose-quote-borders:var(--areia-border)]",
  "[--tw-prose-captions:var(--areia-text-muted)]",
  "[--tw-prose-code:var(--areia-text-strong)]",
  "[--tw-prose-pre-code:var(--areia-text-default)]",
  "[--tw-prose-pre-bg:var(--areia-surface-muted)]",
  "[--tw-prose-th-borders:var(--areia-border)]",
  "[--tw-prose-td-borders:var(--areia-divider)]",
  "prose-a:underline-offset-4",
  "prose-code:before:content-none prose-code:after:content-none",
].join(" ");

declare const __LUZPRESS_CONTENT_DIR__: string;
declare const __LUZPRESS_REPO__: string;
declare const __LUZPRESS_REPO_BRANCH__: string;
declare const __LUZPRESS_REPO_PATH__: string;
declare const __LUZPRESS_RAW_SOURCES__: Record<string, string>;
declare const __LUZPRESS_HEAD_DEFAULTS__: import("unhead").Head | null;

const contentDir = __LUZPRESS_CONTENT_DIR__;
const luzpressRepo = __LUZPRESS_REPO__;
const luzpressRepoBranch = __LUZPRESS_REPO_BRANCH__;
const luzpressRepoPath = __LUZPRESS_REPO_PATH__;
const mdxRawSources: Record<string, string> = __LUZPRESS_RAW_SOURCES__;
export const headDefaults: import("unhead").Head | null = __LUZPRESS_HEAD_DEFAULTS__;
const allMdxModules = {
  ...import.meta.glob("/src/pages/**/*.md"),
  ...import.meta.glob("/src/pages/**/*.mdx"),
} as Record<string, () => Promise<MdxModule>>;

const mdxModules = Object.fromEntries(
  Object.entries(allMdxModules).filter(([filePath]) => filePath.startsWith(contentDir)),
);

function filePathToRoutePath(filePath: string) {
  const routePath = filePath
    .replace(/^\/src\/pages/, "")
    .replace(/\.mdx?$/, "")
    .replace(/\/index$/, "")
    .split("/")
    .filter((segment) => !/^\(.+\)$/.test(segment))
    .join("/");

  return routePath || "/";
}

function titleize(value: string) {
  return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toHtml(content: MdxContent) {
  return typeof content === "string" ? content : content.value;
}

function stripFrontmatter(source: string) {
  if (!source.startsWith("---")) return source;
  const end = source.indexOf("\n---", 3);
  return end === -1 ? source : source.slice(end + 4).replace(/^\s+/, "");
}

function titleFromDocument(filePath: string, rawSource: string) {
  const documentSource = stripFrontmatter(rawSource);
  const heading = documentSource.match(/^#\s+(.+)$/m);
  const title = heading?.[1]?.trim();
  if (title) return title;

  const name = filePath
    .replace(/\.mdx?$/, "")
    .split("/")
    .filter(Boolean)
    .at(-1);

  return titleize(name === "index" ? "overview" : (name ?? "Untitled"));
}

function textFromRawDocument(source: string) {
  return stripFrontmatter(source)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[>*_~#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseScalar(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^['\"]|['\"]$/g, ""))
      .filter(Boolean);
  }
  return trimmed.replace(/^['\"]|['\"]$/g, "");
}

function parseFrontmatter(source: string): Record<string, unknown> {
  if (!source.startsWith("---")) return {};
  const end = source.indexOf("\n---", 3);
  if (end === -1) return {};
  const yaml = source.slice(4, end);
  const entries: Record<string, unknown> = {};
  let listKey: string | undefined;

  for (const line of yaml.split("\n")) {
    const listItem = line.match(/^\s*-\s*(.+)$/);
    if (listItem && listKey) {
      const list = Array.isArray(entries[listKey]) ? entries[listKey] : [];
      list.push(parseScalar(listItem[1]));
      entries[listKey] = list;
      continue;
    }

    const m = line.match(/^([\w-]+):\s*(.*)$/);
    if (!m) continue;
    listKey = undefined;
    if (!m[2].trim()) {
      entries[m[1]] = [];
      listKey = m[1];
    } else {
      entries[m[1]] = parseScalar(m[2]);
    }
  }

  return entries;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string")
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  return [];
}

function metaFromDocument(filePath: string, rawSource: string): ContentMeta {
  const fm = parseFrontmatter(rawSource);
  const title = typeof fm.title === "string" ? fm.title : titleFromDocument(filePath, rawSource);
  const order = typeof fm.order === "number" ? fm.order : undefined;
  const priority = typeof fm.priority === "number" ? fm.priority : order !== undefined ? -order : 0;

  return {
    title,
    description: typeof fm.description === "string" ? fm.description : undefined,
    order,
    priority,
    section: typeof fm.section === "string" ? fm.section : undefined,
    badge: typeof fm.badge === "string" ? fm.badge : undefined,
    draft: fm.draft === true,
    hidden: fm.hidden === true || fm.sidebar === false,
    tags: toStringArray(fm.tags),
  };
}

function insertTreeNode(tree: ContentTreeNode[], routePath: string, meta: ContentMeta) {
  const segments = routePath.split("/").filter(Boolean);
  let level = tree;

  segments.forEach((segment, index) => {
    const path = `/${segments.slice(0, index + 1).join("/")}`;
    const isLeaf = index === segments.length - 1;
    let node = level.find((item) => item.path === path || item.title === titleize(segment));

    if (!node) {
      node = {
        title: isLeaf ? meta.title : titleize(segment),
        path: isLeaf ? path : undefined,
        priority: isLeaf ? meta.priority : 0,
        order: isLeaf ? meta.order : undefined,
        description: isLeaf ? meta.description : undefined,
        badge: isLeaf ? meta.badge : undefined,
        children: [],
      };
      level.push(node);
    }

    if (isLeaf) {
      node.title = meta.title;
      node.path = path;
      node.priority = meta.priority;
      node.order = meta.order;
      node.description = meta.description;
      node.badge = meta.badge;
    }

    level = node.children;
  });

  const sort = (nodes: ContentTreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.order !== undefined || b.order !== undefined)
        return (a.order ?? 9999) - (b.order ?? 9999);
      return b.priority - a.priority || a.title.localeCompare(b.title);
    });
    nodes.forEach((n) => sort(n.children));
  };
  sort(tree);
}

const mdxPages = new Map(
  Object.entries(mdxModules).map(([filePath, loader]) => {
    return [filePathToRoutePath(filePath), loader] as const;
  }),
);

export const contentMeta = Object.fromEntries(
  Object.entries(mdxModules).map(([filePath]) => {
    const path = filePathToRoutePath(filePath);
    return [path, metaFromDocument(filePath, mdxRawSources[path] ?? "")];
  }),
) as Record<string, ContentMeta>;

export const contentTree = Object.entries(mdxModules).reduce<ContentTreeNode[]>(
  (tree, [filePath]) => {
    const routePath = filePathToRoutePath(filePath);
    const meta = contentMeta[routePath];
    if (meta.draft || meta.hidden) return tree;
    insertTreeNode(tree, routePath, meta);
    return tree;
  },
  [],
);

export const searchDocuments = Object.entries(mdxModules)
  .map<SearchDocument | undefined>(([filePath]) => {
    const path = filePathToRoutePath(filePath);
    const meta = contentMeta[path];
    if (meta.draft) return undefined;

    return {
      id: path,
      title: meta.title,
      path,
      description: meta.description,
      tags: meta.tags,
      text: [meta.description, meta.tags.join(" "), textFromRawDocument(mdxRawSources[path] ?? "")]
        .filter(Boolean)
        .join(" "),
    };
  })
  .filter((doc): doc is SearchDocument => Boolean(doc));

export const mdxRoutes = [...mdxPages.keys()];

export function setPrerenderedMdxHtml(html: string | undefined) {
  prerenderedMdxHtml = html;
}

export function getPrerenderedMdxHtml() {
  return prerenderedMdxHtml;
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function getClientPrerenderedMdxHtml(path: string) {
  if (typeof document === "undefined") return undefined;

  const data = document.getElementById("prerender-data")?.textContent;
  if (!data) return undefined;

  try {
    const parsed = JSON.parse(data) as {
      mdxHtml?: unknown;
      mdxHtmlBase64?: unknown;
      mdxPath?: unknown;
    };
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
  const prerenderedMdxHtml = getPrerenderedMdxHtml() ?? getClientPrerenderedMdxHtml(path);
  if (prerenderedMdxHtml) return raw(prerenderedMdxHtml);
  const content = await renderMdxContent(path);
  return content ? raw(escapeUnsafeHtmlScriptTags(toHtml(content))) : null;
}

export function getMdxContent(path: string) {
  const prerenderedMdxHtml = getPrerenderedMdxHtml() ?? getClientPrerenderedMdxHtml(path);
  return prerenderedMdxHtml ? raw(prerenderedMdxHtml) : undefined;
}

function routeToDistMarkdown(routePath: string) {
  if (routePath === "/") return "/index.md";
  return `${routePath}/index.md`;
}

function normalizeRepoUrl(repo: string) {
  const trimmed = repo.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//.test(trimmed)) return trimmed.replace(/\/$/, "");
  return `https://${trimmed.replace(/\/$/, "")}`;
}

export function getMdxSourceForRoute(routePath: string) {
  const normalized = routePath.replace(/\/$/, "") || "/";

  for (const filePath of Object.keys(mdxModules)) {
    if (filePathToRoutePath(filePath) !== normalized) continue;

    const ext = filePath.match(/\.mdx?$/)?.[0] ?? ".mdx";
    const sourceFile = filePath.replace(/^\//, "");

    return {
      routePath: normalized,
      sourceFile,
      markdownUrl: routeToDistMarkdown(normalized),
      ext,
    };
  }

  return undefined;
}

export function getDocLinks(routePath: string) {
  const source = getMdxSourceForRoute(routePath);
  if (!source) return undefined;

  const repo = normalizeRepoUrl(luzpressRepo);
  const branch = luzpressRepoBranch || "main";
  const repoPath = (luzpressRepoPath ?? "").replace(/^\/+|\/+$/g, "");
  const githubFile = repoPath ? `${repoPath}/${source.sourceFile}` : source.sourceFile;

  return {
    routePath: source.routePath,
    markdownUrl: source.markdownUrl,
    githubUrl: repo ? `${repo}/blob/${branch}/${githubFile}` : undefined,
    rawMarkdown: mdxRawSources[source.routePath],
  };
}
