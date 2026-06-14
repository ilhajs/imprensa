import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/core/runtime.ts",
    "src/core/client-runtime.ts",
    "src/core/prerender-core.ts",
    "src/docs/rehype.ts",
    "src/docs/mdx.ts",
  ],
  platform: "node",
  deps: {
    neverBundle: ["ilha:pages/client", "ilha:pages/server", "luzpress/mdx", "$lib/mdx"],
  },
  dts: true,
});
