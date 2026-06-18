import type { ContentTreeNode } from "../docs/mdx/types";
import { titleize } from "../docs/mdx/document-text";

function matchesSegment(node: ContentTreeNode, segment: string): boolean {
  const norm = segment.toLowerCase();
  if (node.path) {
    const parts = node.path.split("/").filter(Boolean);
    const last = parts[parts.length - 1]?.toLowerCase();
    if (last === norm) return true;
  }
  const slug = node.title.toLowerCase().replace(/\s+/g, "-");
  return slug === norm || node.title === titleize(segment);
}

function findNodeForOrderKey(tree: ContentTreeNode[], key: string): ContentTreeNode | undefined {
  const segments = key.split(".").filter(Boolean);
  if (segments.length === 0) return undefined;

  let level = tree;
  let found: ContentTreeNode | undefined;
  for (const seg of segments) {
    found = level.find((n) => matchesSegment(n, seg));
    if (!found) return undefined;
    level = found.children;
  }
  return found;
}

export function sortContentTree(nodes: ContentTreeNode[]): void {
  nodes.sort((a, b) => {
    if (a.order !== undefined || b.order !== undefined)
      return (a.order ?? 9999) - (b.order ?? 9999);
    return b.priority - a.priority || a.title.localeCompare(b.title);
  });
  for (const n of nodes) sortContentTree(n.children);
}

/** Apply `imprensa({ order })`; existing node `order` (e.g. from MDX frontmatter) wins. */
export function applyConfigOrder(
  tree: ContentTreeNode[],
  configOrder: Record<string, number> | undefined,
): ContentTreeNode[] {
  if (!configOrder || Object.keys(configOrder).length === 0) {
    sortContentTree(tree);
    return tree;
  }

  for (const [key, value] of Object.entries(configOrder)) {
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    const node = findNodeForOrderKey(tree, key);
    if (!node) continue;
    if (node.order === undefined) node.order = value;
  }

  sortContentTree(tree);
  return tree;
}
