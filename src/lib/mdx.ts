import type { RawHtml } from "ilha";

let prerenderedMdxHtml: string | undefined;

type MdxContent = string | RawHtml;

type MdxModule = {
  default: (props: Record<string, unknown>) => MdxContent;
};

export type ContentTreeNode = {
  title: string;
  path?: string;
  children: ContentTreeNode[];
};

export type SearchDocument = {
  id: string;
  title: string;
  path: string;
  text: string;
};

const contentDir = "/src/pages/(content)/";
const allMdxModules = {
  ...import.meta.glob<MdxModule>("/src/pages/**/*.md", { eager: true }),
  ...import.meta.glob<MdxModule>("/src/pages/**/*.mdx", { eager: true }),
};

const mdxModules = Object.fromEntries(
  Object.entries(allMdxModules).filter(([filePath]) => filePath.startsWith(contentDir)),
);

function filePathToRoutePath(filePath: string) {
  const routePath = filePath
    .replace(/^\/src\/pages/, "")
    .replace(/\.mdx?$/, "")
    .replace(/\/index$/, "")
    .split("/")
    // Route groups like `(content)` organize files without becoming URL segments.
    .filter((segment) => !/^\(.+\)$/.test(segment))
    .join("/");

  return routePath || "/";
}

function titleize(value: string) {
  return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function renderedDocumentSource(source: unknown) {
  if (typeof source === "string") return source;
  if (typeof source !== "object" || source === null || !("default" in source)) return undefined;

  const render = source.default;
  if (typeof render !== "function") return undefined;

  const content = render({}) as MdxContent;
  return toHtml(content);
}

function titleFromDocument(filePath: string, source: unknown) {
  const documentSource = renderedDocumentSource(source);
  const heading = documentSource?.match(/<(?:h1)[^>]*>(.*?)<\/h1>|^#\s+(.+)$/m);
  const title = heading?.[1] ?? heading?.[2];
  if (title) return title.trim();

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

function insertTreeNode(tree: ContentTreeNode[], routePath: string, title: string) {
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
        children: [],
      };
      level.push(node);
    }

    if (isLeaf) {
      node.title = title;
      node.path = path;
    }

    level = node.children;
  });
}

const mdxPages = new Map(
  Object.entries(mdxModules).map(([filePath, mod]) => {
    return [filePathToRoutePath(filePath), mod.default] as const;
  }),
);

export const contentTree = Object.entries(mdxModules).reduce<ContentTreeNode[]>(
  (tree, [filePath, source]) => {
    insertTreeNode(tree, filePathToRoutePath(filePath), titleFromDocument(filePath, source));
    return tree;
  },
  [],
);

export const searchDocuments = Object.entries(mdxModules).map<SearchDocument>(
  ([filePath, source]) => {
    const path = filePathToRoutePath(filePath);
    const text = textFromDocument(source);

    return {
      id: path,
      title: titleFromDocument(filePath, source),
      path,
      text,
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

function toHtml(content: MdxContent) {
  return typeof content === "string" ? content : content.value;
}

export function renderMdxContent(url: string) {
  return mdxPages.get(normalizePath(url))?.({});
}

export function renderMdx(url: string) {
  const pathname = normalizePath(url);
  const content = renderMdxContent(pathname);
  if (!content) return undefined;

  return { html: toHtml(content), path: pathname };
}
