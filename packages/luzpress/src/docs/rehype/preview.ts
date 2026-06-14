import type { ElementNode } from "./types";
import { textContent } from "./heading-utils";

export function rehypePreview() {
  function visit(node: ElementNode) {
    if (!node.children) return;
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (
        child.type === "element" &&
        child.tagName === "pre" &&
        child.children?.[0]?.tagName === "code"
      ) {
        const code = child.children[0];
        const meta = (code.properties?.metastring ?? code.properties?.meta ?? "") as string;
        if (!meta.includes("preview")) {
          visit(child);
          continue;
        }
        const text = textContent(code);
        node.children[i] = {
          type: "element",
          tagName: "Preview",
          properties: { code: text },
          children: [],
        } as ElementNode;
      } else {
        visit(child);
      }
    }
  }
  return (tree: ElementNode) => visit(tree);
}
