import { describe, expect, test } from "bun:test";
import type { ContentTreeNode } from "../docs/mdx/types";
import { applyConfigOrder } from "./order-apply";

function node(
  title: string,
  children: ContentTreeNode[] = [],
  order?: number,
  path?: string,
): ContentTreeNode {
  return {
    title,
    type: "doc",
    priority: 0,
    order,
    path,
    children,
  };
}

describe("applyConfigOrder", () => {
  test("frontmatter order wins over config", () => {
    const tree = [
      node("Helpers", [], undefined, "/helpers"),
      node("Libraries", [node("Core", [], 5, "/libraries/core")], 2, "/libraries"),
    ];
    applyConfigOrder(tree, { libraries: 1, "libraries.core": 1 });
    expect(tree[0]!.title).toBe("Libraries");
    expect(tree[1]!.title).toBe("Helpers");
    expect(tree[0]!.children[0]!.order).toBe(5);
  });

  test("config orders siblings when no frontmatter order", () => {
    const tree = [
      node("Helpers", [], undefined, "/helpers"),
      node("Libraries", [], undefined, "/libraries"),
    ];
    applyConfigOrder(tree, { libraries: 1, helpers: 2 });
    expect(tree.map((n) => n.title)).toEqual(["Libraries", "Helpers"]);
  });
});
