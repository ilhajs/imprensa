import { describe, expect, it } from "bun:test";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import { rehypeSanitizeTwoslash } from "./rehype-sanitize-twoslash";
import { sanitizeMdxHtmlString } from "./sanitize-mdx-html";
import { shikiPlugin } from "./shiki";
import { assertBalancedPreCode, assertTwoslashPopupRetag, countMatches } from "../test/html-assert";

const shikiOptions = {
  themes: { light: "night-owl-light", dark: "houston" },
  langs: ["typescript", "ts"],
  twoslash: true as const,
};

const TWOSLASH_MD = `# Twoslash sample

\`\`\`ts twoslash
const count = 1;
//    ^?
\`\`\`

Tail paragraph after the fence.
`;

const PLAIN_TS_MD = `# Plain fence

\`\`\`typescript
const ok = 1;
\`\`\`
`;

async function markdownToHtml(markdown: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(shikiPlugin(shikiOptions))
    .use(rehypeSanitizeTwoslash)
    .use(rehypeStringify)
    .process(markdown);
  return String(file);
}

describe("rehype pipeline (remark → shiki → sanitize twoslash)", () => {
  it("highlights plain typescript fences with shiki", async () => {
    const html = await markdownToHtml(PLAIN_TS_MD);
    expect(html).toContain('class="shiki');
    expect(html).toContain("const");
    expect(html).toContain("> ok</span>");
    assertBalancedPreCode(html, "plain ts fence");
  });

  it("runs twoslash on explicit meta and retags popup markup for valid HTML", async () => {
    const html = sanitizeMdxHtmlString(await markdownToHtml(TWOSLASH_MD));
    expect(html).toContain("twoslash");
    expect(html).toContain("Tail paragraph after the fence");
    assertTwoslashPopupRetag(html);
    assertBalancedPreCode(html, "twoslash sample");
    expect(countMatches(html, /<pre\b[^>]*class="[^"]*twoslash/gi)).toBeGreaterThan(0);
  }, 60_000);

  it("escapes raw < in twoslash fence text", async () => {
    const md = `# XSS demo

\`\`\`ts twoslash
const s = "<script>alert(1)</script>";
\`\`\`
`;
    const html = sanitizeMdxHtmlString(await markdownToHtml(md));
    expect(html).not.toMatch(/<script>alert/i);
    expect(html).toMatch(/&#x26;lt;script|&lt;script/i);
  }, 60_000);
});
