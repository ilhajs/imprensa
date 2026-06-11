import type { RawHtml } from "ilha";
import { raw } from "ilha";

let prerenderedMdxHtml: string | undefined;

type MdxContent = string | RawHtml;

import type { Head } from "unhead";

type MdxModule = {
  default: (props: Record<string, unknown>) => MdxContent;
  head?: Head;
};

export type ContentTreeNode = {
  title: string;
  path?: string;
  priority: number;
  children: ContentTreeNode[];
};

export type SearchDocument = {
  id: string;
  title: string;
  path: string;
  text: string;
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
  "prose-code:rounded prose-code:bg-areia-surface-muted prose-code:px-1 prose-code:py-0.5",
  "prose-code:before:content-none prose-code:after:content-none",
  "prose-pre:overflow-visible prose-pre:border prose-pre:border-areia-border prose-pre:bg-areia-surface-muted",
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
  ...import.meta.glob("/src/pages/**/*.md", { eager: true }),
  ...import.meta.glob("/src/pages/**/*.mdx", { eager: true }),
} as Record<string, MdxModule>;

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

function renderedDocumentSource(source: unknown) {
  if (typeof source === "string") return source;
  if (typeof source !== "object" || source === null || !("default" in source)) return undefined;

  const render = source.default;
  if (typeof render !== "function") return undefined;

  try {
    return toHtml(render({}) as MdxContent);
  } catch {
    return undefined;
  }
}

function titleFromDocument(filePath: string, source: unknown) {
  const documentSource = renderedDocumentSource(source);
  const heading = documentSource?.match(/<(?:h1)[^>]*>(.*?)<\/h1>|^#\s+(.+)$/m);
  const title = (heading?.[1]?.replace(/<[^>]+>/g, "") ?? heading?.[2])?.trim();
  if (title) return title;

  const name = filePath
    .replace(/\.mdx?$/, "")
    .split("/")
    .filter(Boolean)
    .at(-1);

  return titleize(name === "index" ? "overview" : (name ?? "Untitled"));
}

function textFromDocument(source: unknown) {
  return (renderedDocumentSource(source) ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseFrontmatter(source: string): Record<string, unknown> {
  if (!source.startsWith("---")) return {};
  const end = source.indexOf("\n---", 3);
  if (end === -1) return {};
  const yaml = source.slice(4, end);
  return Object.fromEntries(
    yaml.split("\n").flatMap((line) => {
      const m = line.match(/^([\w-]+):\s*(.+)$/);
      return m ? [[m[1], isNaN(Number(m[2])) ? m[2].trim() : Number(m[2])]] : [];
    }),
  );
}

function insertTreeNode(tree: ContentTreeNode[], routePath: string, title: string, priority = 0) {
  const segments = routePath.split("/").filter(Boolean);
  let level = tree;

  segments.forEach((segment, index) => {
    const path = `/${segments.slice(0, index + 1).join("/")}`;
    const isLeaf = index === segments.length - 1;
    let node = level.find((item) => item.path === path || item.title === titleize(segment));

    if (!node) {
      node = {
        title: isLeaf ? title : titleize(segment),
        path: isLeaf ? path : undefined,
        priority: isLeaf ? priority : 0,
        children: [],
      };
      level.push(node);
    }

    if (isLeaf) {
      node.title = title;
      node.path = path;
      node.priority = priority;
    }

    level = node.children;
  });

  const sort = (nodes: ContentTreeNode[]) => {
    nodes.sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title));
    nodes.forEach((n) => sort(n.children));
  };
  sort(tree);
}

const mdxPages = new Map(
  Object.entries(mdxModules).map(([filePath, mod]) => {
    return [filePathToRoutePath(filePath), mod.default] as const;
  }),
);

export const contentTree = Object.entries(mdxModules).reduce<ContentTreeNode[]>(
  (tree, [filePath, source]) => {
    const routePath = filePathToRoutePath(filePath);
    const rawSource = mdxRawSources[routePath] ?? "";
    const fm = parseFrontmatter(rawSource);
    const priority = typeof fm.priority === "number" ? fm.priority : 0;
    insertTreeNode(tree, routePath, titleFromDocument(filePath, source), priority);
    return tree;
  },
  [],
);

export const searchDocuments = Object.entries(mdxModules).map<SearchDocument>(
  ([filePath, source]) => {
    const path = filePathToRoutePath(filePath);

    return {
      id: path,
      title: titleFromDocument(filePath, source),
      path,
      text: textFromDocument(source),
    };
  },
);

export const mdxRoutes = [...mdxPages.keys()];

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
    const parsed = JSON.parse(data) as { mdxHtml?: unknown; mdxPath?: unknown };
    const normalizedPath = path.replace(/\/$/, "") || "/";
    return parsed.mdxPath === normalizedPath && typeof parsed.mdxHtml === "string"
      ? parsed.mdxHtml
      : undefined;
  } catch {
    return undefined;
  }
}

function normalizePath(url: string) {
  return new URL(url, "http://localhost").pathname.replace(/\/$/, "") || "/";
}

export function renderMdxContent(url: string) {
  return mdxPages.get(normalizePath(url))?.({});
}

const mdxHeads = new Map(
  Object.entries(mdxModules).map(([filePath, mod]) => {
    return [filePathToRoutePath(filePath), (mod as MdxModule).head] as const;
  }),
);

export function getMdxHead(url: string): Head | undefined {
  return mdxHeads.get(normalizePath(url));
}

export function renderMdx(url: string) {
  const pathname = normalizePath(url);
  const content = renderMdxContent(pathname);
  if (!content) return undefined;

  return { html: toHtml(content), path: pathname };
}

export function getMdxContent(path: string) {
  const prerenderedMdxHtml = getPrerenderedMdxHtml() ?? getClientPrerenderedMdxHtml(path);
  return prerenderedMdxHtml ? raw(prerenderedMdxHtml) : renderMdxContent(path);
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
