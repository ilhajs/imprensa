/** Sidebar / mobile nav tree depth → Tailwind class from `luzpress/default.css`. */
const TREE_INDENT = [
  "luz-tree-indent-0",
  "luz-tree-indent-1",
  "luz-tree-indent-2",
  "luz-tree-indent-3",
  "luz-tree-indent-4",
  "luz-tree-indent-5",
  "luz-tree-indent-6",
] as const;

export function treeIndentClass(depth: number): string {
  return TREE_INDENT[Math.min(Math.max(depth, 0), TREE_INDENT.length - 1)] ?? TREE_INDENT[6];
}
