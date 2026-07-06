import { describe, expect, test } from "bun:test";
import { mergeHead } from "./prerender-head";

describe("mergeHead", () => {
  test("page scalars override defaults", () => {
    expect(mergeHead({ title: "Default" }, { title: "Page" }).title).toBe("Page");
    expect(mergeHead({ title: "Default" }, {}).title).toBe("Default");
  });

  test("page meta does not wipe unrelated default meta", () => {
    const merged = mergeHead(
      {
        meta: [
          { name: "description", content: "default description" },
          { property: "og:image", content: "/og.png" },
        ],
      },
      { meta: [{ name: "description", content: "page description" }] },
    );
    expect(merged.meta).toEqual([
      { property: "og:image", content: "/og.png" },
      { name: "description", content: "page description" },
    ]);
  });

  test("links concatenate with exact duplicates dropped", () => {
    const merged = mergeHead(
      { link: [{ rel: "icon", href: "/favicon.ico" }] },
      {
        link: [
          { rel: "icon", href: "/favicon.ico" },
          { rel: "preload", href: "/font.woff2" },
        ],
      },
    );
    expect(merged.link).toEqual([
      { rel: "icon", href: "/favicon.ico" },
      { rel: "preload", href: "/font.woff2" },
    ]);
  });

  test("handles null/undefined sides", () => {
    expect(mergeHead(null, { title: "Page" })).toEqual({ title: "Page" });
    expect(mergeHead({ meta: [{ name: "a", content: "b" }] }, undefined).meta).toEqual([
      { name: "a", content: "b" },
    ]);
    expect(mergeHead(null, undefined)).toEqual({});
  });
});
