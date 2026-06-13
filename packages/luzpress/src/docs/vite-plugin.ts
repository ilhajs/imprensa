import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { pages } from "@ilha/router/vite";
import mdx from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import type { PluginOption } from "vite";
import { vitePrerenderPlugin } from "vite-prerender-plugin";
import sitemap from "vite-plugin-sitemap";
import { collectMdxRoutes, collectRawMdxSources, normalizeContentDir } from "../core/routes";
import { getShikiHighlighterOptions, shikiFineGrainedRuntime, shikiPlugin } from "../core/shiki";
import { generateLlmsArtifacts } from "./llms";
import { MDX_CONFIG_MARKER } from "./mdx-config";
import type { LuzpressOptions } from "./options";
import { remarkPreview } from "./remark";
import { SIDEBAR_LAYOUT_BOOT_SCRIPT } from "../components/sidebar-layout";
import { rehypeDeadLinks } from "./rehype";

const require = createRequire(import.meta.url);
/** Resolved from published `dist/index.mjs` → `src/docs/mdx.ts`. */
const MDX_SOURCE = fileURLToPath(new URL("../src/docs/mdx.ts", import.meta.url));
const COMPONENTS_INDEX = fileURLToPath(new URL("../src/components/index.tsx", import.meta.url));
const DOC_TOOLBAR = fileURLToPath(new URL("../src/components/doc-toolbar.tsx", import.meta.url));
const CONFIG_STUB = fileURLToPath(new URL("../src/docs/config.ts", import.meta.url));
const LUZPRESS_RUNTIME_SOURCE = fileURLToPath(new URL("../src/core/runtime.ts", import.meta.url));
const LUZPRESS_PRERENDER_SOURCE = fileURLToPath(
  new URL("../src/core/prerender-core.ts", import.meta.url),
);

export function createLuzpressVitePlugins(options: LuzpressOptions = {}): PluginOption[] {
  const {
    shiki,
    mdx: mdxOptions = {},
    pages: pagesOptions = {},
    contentDir = "src/pages/(content)",
    detectDeadLink = true,
    llms = true,
    repo = "",
    repoBranch = "main",
    repoPath = "",
    hostname,
    head: headDefaults,
    socials = [],
    preview = {},
  } = options;

  const { rehypePlugins = [], remarkPlugins = [], ...restMdxOptions } = mdxOptions;
  const coreRehypePlugins = [
    rehypeSlug,
    [
      rehypeAutolinkHeadings,
      {
        behavior: "wrap",
        properties: { className: ["heading-anchor"] },
      },
    ],
    ...(detectDeadLink ? [rehypeDeadLinks] : []),
  ];

  const highlighterOptions = getShikiHighlighterOptions(shiki);
  let isBuild = false;

  const ilhaPagesOptions = {
    interceptLinks: false as const,
    ...pagesOptions,
    mode: (pagesOptions.mode ?? "static") as "spa" | "static",
  };

  const plugins: PluginOption[] = [
    mdx({
      jsxImportSource: "ilha",
      ...restMdxOptions,
      remarkPlugins: [remarkPreview, ...(remarkPlugins as any[])],
      rehypePlugins: [...shikiPlugin(shiki), ...coreRehypePlugins, ...rehypePlugins],
    }),
    {
      name: "luzpress:ilha-pages",
      enforce: "pre",
      config(_config, { command }) {
        ilhaPagesOptions.mode = pagesOptions.mode ?? (command === "serve" ? "spa" : "static");
      },
    },
    pages(ilhaPagesOptions),
  ];

  plugins.push(tailwindcss());
  plugins.push(
    vitePrerenderPlugin({
      renderTarget: "#app",
      prerenderScript: path.join(process.cwd(), "src/prerender.ts"),
    }),
  );
  plugins.push(sitemap({ hostname, dynamicRoutes: collectMdxRoutes(contentDir) }));
  plugins.push({
    name: "luzpress:html",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        if (!html.includes("luz-sidebar-layout-boot")) {
          html = html.replace("</head>", `    ${SIDEBAR_LAYOUT_BOOT_SCRIPT}\n  </head>`);
        }
        return html;
      },
    },
  });
  plugins.push({
    name: "luzpress:html-post",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        return html.replace(
          /<link rel="stylesheet" crossorigin href="(\/assets\/[^"]+\.css)">/g,
          '<link rel="preload" as="style" href="$1" crossorigin />\n    $&',
        );
      },
    },
  });
  plugins.push({
    name: "luzpress:config",
    enforce: "pre",
    resolveId(id) {
      if (id === "luzpress") return "\0luzpress:runtime";
      if (id === "luzpress/shiki") return "\0luzpress:shiki";
      if (id === "luzpress/config") return "\0luzpress:config";
      if (id === CONFIG_STUB || id.endsWith("/luzpress/src/docs/config.ts"))
        return "\0luzpress:config";
      if (id === "luzpress/mdx") return MDX_SOURCE;
      if (id === "luzpress/components") return COMPONENTS_INDEX;
      if (id === "luzpress/doc") return DOC_TOOLBAR;
    },
    load(id) {
      if (id === "\0luzpress:config") {
        return `export const socials = ${JSON.stringify(socials)};
export const preview = ${JSON.stringify(preview)};`;
      }
      if (id === "\0luzpress:shiki") return shikiFineGrainedRuntime(highlighterOptions);
      if (id !== "\0luzpress:runtime") return;

      return `
        export {
          THEME_STORAGE_KEY,
          applyInitialTheme,
          applyThemeToHtml,
          createLuzpress,
          createPrerender,
          getStoredTheme,
          mountOrHydrate,
          setStoredTheme,
        } from "luzpress/runtime";
        export {
          LogoButton,
          SearchOverlay,
          ThemeToggle,
        } from "luzpress/components";
        export const shiki = import("luzpress/shiki").then((m) => m.shiki);
        export {
          DocArticle,
          DocPager,
          DocToolbar,
          getAdjacentDocs,
        } from "luzpress/doc";
        export {
          articleClass,
          contentTree,
          getClientPrerenderedMdxHtml,
          getDocLinks,
          getMdxContent,
          getMdxHead,
          getMdxSourceForRoute,
          getPrerenderedMdxHtml,
          headDefaults,
          mdxRoutes,
          renderMdx,
          renderMdxContent,
          searchDocuments,
          setPrerenderedMdxHtml,
        } from "luzpress/mdx";
      `;
    },
    transform(code, id) {
      if (/\.mdx?$/.test(id) && code.startsWith("---")) {
        const end = code.indexOf("\n---", 3);
        if (end !== -1) return { code: code.slice(end + 4), map: null };
      }
      if (id !== MDX_SOURCE && !id.endsWith("/luzpress/src/docs/mdx.ts")) return;
      return code.replace(
        MDX_CONFIG_MARKER,
        `const contentDir = ${JSON.stringify(normalizeContentDir(contentDir))};
const luzpressRepo = ${JSON.stringify(repo)};
const luzpressRepoBranch = ${JSON.stringify(repoBranch)};
const luzpressRepoPath = ${JSON.stringify(repoPath)};
const mdxRawSources = ${JSON.stringify(collectRawMdxSources(process.cwd(), contentDir))} as Record<string, string>;
export const headDefaults = ${JSON.stringify(headDefaults ?? null)} as import("unhead").Head | null;`,
      );
    },
    config() {
      const root = process.cwd();
      let sonner = "sonner";

      try {
        sonner = createRequire(path.join(root, "package.json")).resolve("sonner");
      } catch {
        // Plugin dev without sonner in cwd
      }

      return {
        build: {
          rolldownOptions: {
            output: {
              codeSplitting: {
                groups: [
                  {
                    name: "luzpress-shiki",
                    test: /luzpress[\/]shiki|@shikijs[\/]|(?:^|[\/])shiki[\/]/,
                  },
                  {
                    name: "luzpress-search",
                    test: /minisearch/,
                  },
                ],
              },
            },
          },
        },
        resolve: {
          alias: {
            $lib: path.resolve(root, "src", "lib"),
            sonner,
            "luzpress/prerender": LUZPRESS_PRERENDER_SOURCE,
          },
          dedupe: [
            "@areia/slots",
            "@ilha/router",
            "areia",
            "ilha",
            "lucide",
            "minisearch",
            "quando",
            "sonner",
          ],
        },
      };
    },
    configResolved(config) {
      isBuild = config.command === "build";
    },
    closeBundle() {
      if (!isBuild) return;

      generateLlmsArtifacts({
        root: process.cwd(),
        outDir: path.resolve(process.cwd(), "dist"),
        contentDir,
        llms,
      });
    },
  });

  return plugins;
}

/** Vite meta-plugin preset for Luz documentation sites. */
export function luzpress(options: LuzpressOptions = {}): PluginOption[] {
  return createLuzpressVitePlugins(options);
}
