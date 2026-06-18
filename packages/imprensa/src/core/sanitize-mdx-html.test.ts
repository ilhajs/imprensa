import { describe, expect, it } from "bun:test";
import { sanitizeMdxHtmlString } from "./sanitize-mdx-html";

describe("sanitizeMdxHtmlString", () => {
  it("removes script tags and event handlers", () => {
    const dirty = `<p>ok</p><img src="x" onerror="alert(1)"><script>alert(1)</script>`;
    const clean = sanitizeMdxHtmlString(dirty);
    expect(clean).toContain("<p>ok</p>");
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("onerror");
  });

  it("keeps escaped twoslash demo text in spans", () => {
    const dirty = `<span>&lt;script&gt;alert(1)&lt;/script&gt;</span>`;
    const clean = sanitizeMdxHtmlString(dirty);
    expect(clean).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("strips javascript URLs", () => {
    const dirty = `<a href="javascript:alert(1)">bad</a><img src='javascript:alert(1)'>`;
    const clean = sanitizeMdxHtmlString(dirty);
    expect(clean).not.toContain("javascript:");
  });

  it("does not preserve executable iframe srcdoc", () => {
    const dirty = `<iframe srcdoc="<script>alert(1)</script>"></iframe>`;
    const clean = sanitizeMdxHtmlString(dirty);
    expect(clean).not.toContain("<script>");
  });
});
