import { describe, expect, it } from "bun:test";
import { escapeTwoslashHoverTypeText, rehypeSanitizeTwoslash } from "./rehype-sanitize-twoslash";

describe("rehypeSanitizeTwoslash", () => {
  it("escapes raw < in twoslash pre source text nodes", () => {
    const tree = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "pre",
          properties: { className: ["shiki", "twoslash"] },
          children: [
            {
              type: "element",
              tagName: "code",
              properties: {},
              children: [
                {
                  type: "element",
                  tagName: "span",
                  properties: {},
                  children: [{ type: "text", value: '"<script>alert(1)</script>"' }],
                },
              ],
            },
          ],
        },
      ],
    };
    rehypeSanitizeTwoslash()(tree);
    const text = (
      tree.children[0] as { children: { children: { children: { value: string }[] }[] }[] }
    ).children[0]!.children[0]!.children[0]!.value;
    expect(text).not.toContain("<script");
    expect(text).toContain("&lt;script");
  });

  it("escapes raw < in twoslash-popup-code text nodes", () => {
    const tree = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "code",
          properties: { className: ["twoslash-popup-code"] },
          children: [{ type: "text", value: '"<img onerror=alert(1)>"' }],
        },
      ],
    };
    rehypeSanitizeTwoslash()(tree);
    const text = (tree.children[0] as { children: { value: string }[] }).children[0]!.value;
    expect(text).toContain("&lt;img");
  });
});

describe("escapeTwoslashHoverTypeText", () => {
  it("unicode-escapes angle brackets for hover type strings", () => {
    expect(escapeTwoslashHoverTypeText('"<script>"')).toContain("\\u003c");
    expect(escapeTwoslashHoverTypeText('"<script>"')).not.toContain("<script");
  });
});
