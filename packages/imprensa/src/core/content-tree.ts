import type { ContentMeta, ContentTreeNode } from "../docs/mdx/types";
import { metaFromDocument, titleize } from "../docs/mdx/document-text";
import { applyConfigOrder, sortContentTree } from "./order-apply";

export function insertTreeNode(tree: ContentTreeNode[], routePath: string, meta: ContentMeta) {
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

  sortContentTree(tree);
}

/** Build nav tree from route path → raw MDX source (disk or injected config). */
export function buildContentTreeFromSources(
  sources: Record<string, string>,
  filePathForRoute: (routePath: string) => string = (routePath) =>
    `/src/pages${routePath === "/" ? "" : routePath}.mdx`,
  configOrder?: Record<string, number>,
): ContentTreeNode[] {
  const tree: ContentTreeNode[] = [];
  for (const [routePath, raw] of Object.entries(sources)) {
    const meta = metaFromDocument(filePathForRoute(routePath), raw);
    if (meta.draft || meta.hidden) continue;
    insertTreeNode(tree, routePath, meta);
  }
  return applyConfigOrder(tree, configOrder);
}
