import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));

describe("DocPager layout", () => {
  it("uses items-start on the pagination grid so cards do not stretch", () => {
    const source = readFileSync(join(dir, "doc-pager.tsx"), "utf8");
    expect(source).toContain("items-start");
    expect(source).not.toContain('LayerCard class="h-full');
    expect(source).not.toContain('class="group block h-full');
  });
});
