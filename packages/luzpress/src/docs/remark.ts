import type { Code, Root } from "mdast";

type MdxJsxFlowElement = {
  type: "mdxJsxFlowElement";
  name: string;
  attributes: Array<{
    type: "mdxJsxAttribute";
    name: string;
    value: {
      type: "mdxJsxAttributeValueExpression";
      value: string;
      data: { estree: { type: "Program"; body: object[]; sourceType: "module" } };
    };
  }>;
  children: [];
};

type MdxEsmNode = {
  type: "mdxjsEsm";
  value: string;
  data: { estree: { type: "Program"; body: object[]; sourceType: "module" } };
};

type RootChild = Root["children"][number] | MdxJsxFlowElement | MdxEsmNode;

function isCode(node: RootChild): node is Code {
  return node.type === "code";
}

export function remarkPreview() {
  return (tree: Root) => {
    let hasPreview = false;
    tree.children = tree.children.map((node) => {
      if (!isCode(node) || !(node.meta ?? "").includes("preview")) return node;
      hasPreview = true;
      const previewNode: MdxJsxFlowElement = {
        type: "mdxJsxFlowElement",
        name: "Preview",
        attributes: [
          {
            type: "mdxJsxAttribute",
            name: "code64",
            value: {
              type: "mdxJsxAttributeValueExpression",
              value: JSON.stringify(Buffer.from(node.value).toString("base64")),
              data: {
                estree: {
                  type: "Program",
                  body: [
                    {
                      type: "ExpressionStatement",
                      expression: {
                        type: "Literal",
                        value: Buffer.from(node.value).toString("base64"),
                      },
                    },
                  ],
                  sourceType: "module",
                },
              },
            },
          },
        ],
        children: [],
      };
      return previewNode as Root["children"][number];
    });
    if (!hasPreview) return;
    const importNode: MdxEsmNode = {
      type: "mdxjsEsm",
      value: "import { Preview } from 'luzpress/components';",
      data: {
        estree: {
          type: "Program",
          body: [
            {
              type: "ImportDeclaration",
              specifiers: [
                {
                  type: "ImportSpecifier",
                  imported: { type: "Identifier", name: "Preview" },
                  local: { type: "Identifier", name: "Preview" },
                },
              ],
              source: { type: "Literal", value: "luzpress/components" },
            },
          ],
          sourceType: "module",
        },
      },
    };
    tree.children.unshift(importNode as Root["children"][number]);
  };
}
