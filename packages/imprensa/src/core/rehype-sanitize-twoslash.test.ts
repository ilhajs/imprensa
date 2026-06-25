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

  it("retags code.twoslash-popup-code to div (avoids adoption-agency leak)", () => {
    const tree = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "span",
          properties: { className: ["twoslash-popup-container"] },
          children: [
            {
              type: "element",
              tagName: "code",
              properties: { className: ["twoslash-popup-code"] },
              children: [
                {
                  type: "element",
                  tagName: "pre",
                  properties: { className: ["shiki"] },
                  children: [
                    // nested popup-code (popup inside popup) must retag too
                    {
                      type: "element",
                      tagName: "code",
                      properties: { className: ["twoslash-popup-code"] },
                      children: [{ type: "text", value: "x" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    rehypeSanitizeTwoslash()(tree);
    const container = tree.children[0] as HastTestElement;
    const popupCode = container.children![0] as HastTestElement;
    expect(popupCode.tagName).toBe("div");
    const nestedShiki = popupCode.children![0] as HastTestElement;
    expect(nestedShiki.tagName).toBe("div");
    const nestedPopupCode = nestedShiki.children![0] as HastTestElement;
    expect(nestedPopupCode.tagName).toBe("div");
  });

  it("retags popup-code when Twoslash uses properties.class (not className)", () => {
    const tree = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "code",
          properties: { class: "twoslash-popup-code" },
          children: [{ type: "text", value: "number" }],
        },
      ],
    };
    rehypeSanitizeTwoslash()(tree);
    expect((tree.children[0] as HastTestElement).tagName).toBe("div");
  });

  it("retags popup-code nested inside pre.twoslash (production Twoslash shape)", () => {
    const tree = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "pre",
          properties: { class: "shiki twoslash" },
          children: [
            {
              type: "element",
              tagName: "code",
              properties: {},
              children: [
                {
                  type: "element",
                  tagName: "span",
                  properties: { className: ["line"] },
                  children: [
                    {
                      type: "element",
                      tagName: "span",
                      properties: { className: ["twoslash-hover"] },
                      children: [
                        {
                          type: "element",
                          tagName: "span",
                          properties: { className: ["twoslash-popup-container"] },
                          children: [
                            {
                              type: "element",
                              tagName: "code",
                              properties: { class: "twoslash-popup-code" },
                              children: [{ type: "text", value: "number" }],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    rehypeSanitizeTwoslash()(tree);
    const pre = tree.children[0] as HastTestElement;
    const fenceCode = pre.children![0] as HastTestElement;
    const line = fenceCode.children![0] as HastTestElement;
    const hover = line.children![0] as HastTestElement;
    const container = hover.children![0] as HastTestElement;
    const popupCode = container.children![0] as HastTestElement;
    expect(popupCode.tagName).toBe("div");
  });

  it("retags pre.shiki inside twoslash-popup-code to div (nested pre in fence)", () => {
    const tree = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "pre",
          properties: { class: "shiki twoslash" },
          children: [
            {
              type: "element",
              tagName: "code",
              properties: {},
              children: [
                {
                  type: "element",
                  tagName: "div",
                  properties: { class: "twoslash-popup-code" },
                  children: [
                    {
                      type: "element",
                      tagName: "pre",
                      properties: { class: "shiki shiki-themes" },
                      children: [
                        {
                          type: "element",
                          tagName: "code",
                          properties: {},
                          children: [{ type: "text", value: "type" }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    rehypeSanitizeTwoslash()(tree);
    const fence = tree.children[0] as HastTestElement;
    const fenceCode = fence.children![0] as HastTestElement;
    const popupCode = fenceCode.children![0] as HastTestElement;
    const inner = popupCode.children![0] as HastTestElement;
    expect(inner.tagName).toBe("div");
    expect(inner.children![0]!.tagName).toBe("code");
  });
});

type HastTestElement = { tagName: string; children?: HastTestElement[] };

describe("escapeTwoslashHoverTypeText", () => {
  it("unicode-escapes angle brackets for hover type strings", () => {
    expect(escapeTwoslashHoverTypeText('"<script>"')).toContain("\\u003c");
    expect(escapeTwoslashHoverTypeText('"<script>"')).not.toContain("<script");
  });
});
