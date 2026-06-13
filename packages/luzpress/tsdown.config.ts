import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/core/runtime.ts",
    "src/core/prerender-core.ts",
    "src/docs/rehype.ts",
    "src/docs/mdx.ts",
  ],
  platform: "node",
  external: ["ilha:pages", "ilha:registry", "$lib/mdx"],
  dts: true,
});
