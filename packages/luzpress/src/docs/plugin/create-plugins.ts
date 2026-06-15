import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { pages } from "@ilha/router/vite";
import mdx, { type Options as MdxRollupOptions } from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import type { PluginOption } from "vite";
import { vitePrerenderPlugin } from "vite-prerender-plugin";
import sitemap from "vite-plugin-sitemap";
import { collectMdxRoutes, collectRawMdxSources, normalizeContentDir } from "../../core/routes";
import { getShikiHighlighterOptions, shikiFineGrainedRuntime, shikiPlugin } from "../../core/shiki";
import { generateLlmsArtifacts } from "../llms";
import { MDX_CONFIG_MARKER } from "../mdx-config";
import type { LuzpressOptions } from "../options";
import { remarkPreview } from "../remark";
import { SIDEBAR_LAYOUT_BOOT_SCRIPT } from "../../components/sidebar-layout";
import { rehypeDeadLinks } from "../rehype";
import { buildLandingShikiModule } from "./landing-shiki";
import { LUZPRESS_VIRTUAL_RUNTIME } from "./virtual-runtime";

/** Resolved from published `dist/index.mjs` → `src/...`. */
const MDX_SOURCE = fileURLToPath(new URL("../src/docs/mdx.ts", import.meta.url));
const MDX_RUNTIME_CONFIG = fileURLToPath(
  new URL("../src/docs/mdx/runtime-config.ts", import.meta.url),
);
const COMPONENTS_INDEX = fileURLToPath(new URL("../src/components/index.tsx", import.meta.url));
const DOC_ENTRY = fileURLToPath(new URL("../src/components/doc.tsx", import.meta.url));
const CONFIG_STUB = fileURLToPath(new URL("../src/docs/config.ts", import.meta.url));
const ICONS_ENTRY = fileURLToPath(new URL("../src/components/icons.tsx", import.meta.url));
const LUZPRESS_PRERENDER_ENTRY = path.resolve(
  fileURLToPath(new URL("./core/prerender-core.mjs", import.meta.url)),
);
const LUZPRESS_CLIENT_RUNTIME = path.resolve(
  fileURLToPath(new URL("./core/client-runtime.mjs", import.meta.url)),
);

function isMdxConfigTarget(id: string) {
  return (
    id === MDX_RUNTIME_CONFIG ||
    id.endsWith("/luzpress/src/docs/mdx/runtime-config.ts") ||
    id === MDX_SOURCE ||
    id.endsWith("/luzpress/src/docs/mdx.ts")
  );
}

function isAppPageFile(file: string, root: string) {
  const relative = path.relative(path.join(root, "src/pages"), file).replace(/\\/g, "/");
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

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

  const { rehypePlugins, remarkPlugins, ...restMdxOptions } = mdxOptions;
  const resolvedRemarkPlugins = remarkPlugins ?? [];
  const resolvedRehypePlugins = rehypePlugins ?? [];
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
  const shikiThemes =
    shiki === false || !shiki?.themes
      ? { light: "night-owl-light", dark: "houston" }
      : shiki.themes;
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
      remarkPlugins: [remarkPreview, ...resolvedRemarkPlugins],
      rehypePlugins: [
        ...shikiPlugin(shiki),
        ...coreRehypePlugins,
        ...resolvedRehypePlugins,
      ] as MdxRollupOptions["rehypePlugins"],
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
      prerenderScript: path.join(process.cwd(), "src/main.ts"),
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
      if (id === "luzpress/doc") return DOC_ENTRY;
      if (id === "luzpress/icons") return ICONS_ENTRY;
      if (id === "luzpress/landing-shiki") return "\0luzpress:landing-shiki";
    },
    async load(id) {
      if (id === "\0luzpress:landing-shiki") {
        return buildLandingShikiModule(process.cwd(), shiki);
      }
      if (id === "\0luzpress:config") {
        return `export const socials = ${JSON.stringify(socials)};
export const preview = ${JSON.stringify(preview)};
export const shiki = ${JSON.stringify(shiki === false ? false : (shiki ?? {}))};
export const hostname = ${JSON.stringify(hostname ?? "")};
export const shikiThemes = ${JSON.stringify(shikiThemes)};`;
      }
      if (id === "\0luzpress:shiki") {
        if (!highlighterOptions.clientShiki || highlighterOptions.langs.length === 0) {
          return `export const shiki = {
  loadLanguage: async () => {},
  codeToHtml: () => "",
};`;
        }
        return shikiFineGrainedRuntime({
          themes: highlighterOptions.themes,
          langs: highlighterOptions.langs,
        });
      }
      if (id !== "\0luzpress:runtime") return;

      return LUZPRESS_VIRTUAL_RUNTIME.replace("__SHIKI_THEMES__", JSON.stringify(shikiThemes));
    },
    transform(code, id) {
      if (/\.mdx?$/.test(id) && code.startsWith("---")) {
        const end = code.indexOf("\n---", 3);
        if (end !== -1) return { code: code.slice(end + 4), map: null };
      }
      if (!isMdxConfigTarget(id)) return;
      return code.replace(
        MDX_CONFIG_MARKER,
        `export const contentDir = ${JSON.stringify(normalizeContentDir(contentDir))};
export const luzpressRepo = ${JSON.stringify(repo)};
export const luzpressRepoBranch = ${JSON.stringify(repoBranch)};
export const luzpressRepoPath = ${JSON.stringify(repoPath)};
export const mdxRawSources = ${JSON.stringify(collectRawMdxSources(process.cwd(), contentDir))} as Record<string, string>;
export const headDefaults = ${JSON.stringify(headDefaults ?? null)} as import("unhead/types").ResolvableHead | null;`,
      );
    },
    handleHotUpdate(ctx) {
      if (!isAppPageFile(ctx.file, ctx.server.config.root)) return;

      for (const module of ctx.server.moduleGraph.getModulesByFile(MDX_RUNTIME_CONFIG) ?? []) {
        ctx.server.moduleGraph.invalidateModule(module);
      }
      for (const module of ctx.server.moduleGraph.getModulesByFile(MDX_SOURCE) ?? []) {
        ctx.server.moduleGraph.invalidateModule(module);
      }

      ctx.server.ws.send({ type: "full-reload", path: "*" });
      return [];
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
        server: {
          watch: {
            usePolling: true,
          },
        },
        build: {
          rolldownOptions: {
            output: {
              codeSplitting: {
                groups: [
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
            "luzpress/prerender": LUZPRESS_PRERENDER_ENTRY,
            "luzpress/runtime": LUZPRESS_CLIENT_RUNTIME,
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
