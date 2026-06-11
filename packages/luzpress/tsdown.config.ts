import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/runtime.ts", "src/rehype.ts", "src/mdx.ts"],
  platform: "node",
  external: ["ilha:pages", "ilha:registry", "$lib/mdx"],
  dts: true,
});
