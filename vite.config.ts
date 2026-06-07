import path from "node:path";
import { pages } from "@ilha/router/vite";
import mdx from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";
import { vitePrerenderPlugin } from "vite-prerender-plugin";
import { transformerTwoslash } from "@shikijs/twoslash";
import rehypeShiki from "@shikijs/rehype";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    mdx({
      jsxImportSource: "ilha",
      rehypePlugins: [
        [
          rehypeShiki,
          {
            themes: { light: "night-owl-light", dark: "houston" },
            langs: ["ts"],
            transformers: [transformerTwoslash()],
          },
        ],
      ],
    }),
    pages(),
    tailwindcss(),
    vitePrerenderPlugin(),
  ],
  resolve: {
    alias: {
      $lib: path.resolve(import.meta.dirname, "src", "lib"),
    },
  },
  server: {
    watch: {
      usePolling: true,
    },
  },
});
