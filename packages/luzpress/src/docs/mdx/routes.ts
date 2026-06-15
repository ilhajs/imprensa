import type { MdxModule } from "./types";
import { metaFromDocument, textFromRawDocument, titleize } from "./document-text";
import type { ContentMeta, ContentTreeNode, SearchDocument } from "./types";
import { contentDir, mdxRawSources } from "./runtime-config";

const allMdxModules = {
  ...import.meta.glob("/src/pages/**/*.md"),
  ...import.meta.glob("/src/pages/**/*.mdx"),
} as Record<string, () => Promise<MdxModule>>;

export const mdxModules = Object.fromEntries(
  Object.entries(allMdxModules).filter(([filePath]) => filePath.startsWith(contentDir)),
);

export function filePathToRoutePath(filePath: string) {
  const routePath = filePath
    .replace(/^\/src\/pages/, "")
    .replace(/\.mdx?$/, "")
    .replace(/\/index$/, "")
    .split("/")
    .filter((segment) => !/^\(.+\)$/.test(segment))
    .join("/");

  return routePath || "/";
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
        type: isLeaf ? meta.type : "doc",
        link: isLeaf ? meta.link : undefined,
        external: isLeaf ? meta.external : undefined,
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
      node.type = meta.type;
      node.link = meta.link;
      node.external = meta.external;
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

export const contentMeta = Object.fromEntries(
  Object.entries(mdxModules).map(([filePath]) => {
    const path = filePathToRoutePath(filePath);
    return [path, metaFromDocument(filePath, mdxRawSources[path] ?? "")];
  }),
) as Record<string, ContentMeta>;

export const mdxPages = new Map(
  Object.entries(mdxModules)
    .map(([filePath, loader]) => [filePathToRoutePath(filePath), loader] as const)
    .filter(([path]) => contentMeta[path]?.type !== "link"),
);

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
    if (meta.draft || meta.type === "link") return undefined;

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
