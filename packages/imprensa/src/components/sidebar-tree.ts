import { contentTree } from "imprensa/content-tree";
import type { ContentTreeNode } from "imprensa/mdx";
import { topLevelSplit } from "imprensa/config";

function normalizePath(path: string) {
  return path.replace(/\/$/, "") || "/";
}

function titleizeSegment(segment: string) {
  return segment.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function collectPaths(node: ContentTreeNode): string[] {
  const paths: string[] = [];
  if (node.path) paths.push(normalizePath(node.path));
  for (const child of node.children) paths.push(...collectPaths(child));
  return paths;
}

function nodeBelongsToTopSegment(node: ContentTreeNode, segment: string): boolean {
  const prefix = `/${segment}`;
  if (
    node.path &&
    (normalizePath(node.path) === prefix || normalizePath(node.path).startsWith(`${prefix}/`))
  ) {
    return true;
  }
  if (node.title === titleizeSegment(segment)) return true;
  return collectPaths(node).some((p) => p === prefix || p.startsWith(`${prefix}/`));
}

function findTopLevelSection(
  tree: ContentTreeNode[],
  segment: string,
): ContentTreeNode | undefined {
  return tree.find((node) => nodeBelongsToTopSegment(node, segment));
}

/** Sidebar / mobile nav nodes for the current route (respects `topLevelSplit`). */
export function sidebarTreeForPath(pathname: string): ContentTreeNode[] {
  if (!topLevelSplit) return contentTree;

  const path = normalizePath(pathname);
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return contentTree;

  const section = findTopLevelSection(contentTree, segments[0]!);
  if (!section) return contentTree;

  if (section.children.length > 0) return section.children;

  return [section];
}
