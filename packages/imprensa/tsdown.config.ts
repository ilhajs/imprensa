import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/core/runtime.ts",
    "src/core/client-runtime.ts",
    "src/core/prerender-core.ts",
    "src/core/shiki-build.ts",
    "src/docs/rehype.ts",
    "src/docs/mdx.ts",
    "src/docs/config.ts",
    "src/docs/landing-shiki.ts",
    "src/components/index.tsx",
    "src/components/icons.tsx",
    "src/components/doc.tsx",
  ],
  platform: "node",
  deps: {
    neverBundle: [
      "ilha:pages/client",
      "ilha:pages/server",
      "imprensa/mdx",
      "imprensa/config",
      "imprensa/components",
      "imprensa/doc",
      "imprensa/icons",
      "imprensa/runtime",
      "imprensa/prerender",
      "imprensa/shiki",
      "$lib/mdx",
    ],
  },
  dts: true,
});
