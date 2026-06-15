/** Sidebar / mobile nav tree depth → Tailwind class from `imprensa/default.css`. */
const TREE_INDENT = [
  "imprensa-tree-indent-0",
  "imprensa-tree-indent-1",
  "imprensa-tree-indent-2",
  "imprensa-tree-indent-3",
  "imprensa-tree-indent-4",
  "imprensa-tree-indent-5",
  "imprensa-tree-indent-6",
] as const;

export function treeIndentClass(depth: number): string {
  return TREE_INDENT[Math.min(Math.max(depth, 0), TREE_INDENT.length - 1)] ?? TREE_INDENT[6];
}
