import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { getMdxManifest, invalidateMdxManifest } from "./mdx-manifest";

describe("MDX island sequence scan", () => {
  it("ignores JSX-like names inside inline code when building island order", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "imprensa-mdx-"));
    const contentDir = path.join(root, "src/pages");
    fs.mkdirSync(contentDir, { recursive: true });

    const mdxPath = path.join(contentDir, "demo.mdx");
    fs.writeFileSync(
      mdxPath,
      `---
title: Demo
---

import { Preview } from "imprensa/components";

Use \`<Preview />\` in prose only.

<Preview />
`,
    );

    try {
      invalidateMdxManifest();
      const manifest = getMdxManifest(root, "src/pages");
      expect((manifest.sequences.match(/Preview/g) ?? []).length).toBe(1);
    } finally {
      invalidateMdxManifest();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
