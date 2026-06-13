export function remarkPreview() {
  return (tree: any) => {
    let hasPreview = false;
    tree.children = tree.children.map((node: any) => {
      if (node.type !== "code" || !(node.meta ?? "").includes("preview")) return node;
      hasPreview = true;
      return {
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
    });
    if (!hasPreview) return;
    tree.children.unshift({
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
    });
  };
}
