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
import type { ImprensaOptions } from "../options";
import { remarkPreview } from "../remark";
import { SIDEBAR_LAYOUT_BOOT_SCRIPT } from "../../components/sidebar-layout";
import { rehypeDeadLinks } from "../rehype";
import { buildLandingShikiModule } from "./landing-shiki";
import { IMPRENSA_VIRTUAL_RUNTIME } from "./virtual-runtime";

/**
 * MDX runtime config is transformed by this Vite plugin, so it needs the packaged source.
 * UI subpaths can use published dist files; consumers should not need the full source tree.
 */
const MDX_SOURCE = fileURLToPath(new URL("../src/docs/mdx.ts", import.meta.url));
const MDX_RUNTIME_CONFIG = fileURLToPath(
  new URL("../src/docs/mdx/runtime-config.ts", import.meta.url),
);
const COMPONENTS_INDEX = fileURLToPath(new URL("./components/index.mjs", import.meta.url));
const DOC_ENTRY = fileURLToPath(new URL("./components/doc.mjs", import.meta.url));
const CONFIG_STUB = fileURLToPath(new URL("./docs/config.mjs", import.meta.url));
const ICONS_ENTRY = fileURLToPath(new URL("./components/icons.mjs", import.meta.url));
const IMPRENSA_PRERENDER_ENTRY = path.resolve(
  fileURLToPath(new URL("./core/prerender-core.mjs", import.meta.url)),
);
const IMPRENSA_CLIENT_RUNTIME = path.resolve(
  fileURLToPath(new URL("./core/client-runtime.mjs", import.meta.url)),
);
/** Published bundle still references __IMPRENSA_* until the Vite plugin rewrites them. */
const MDX_DIST_BUNDLE = path.join(
  fileURLToPath(new URL("../../..", import.meta.url)),
  "dist/docs/mdx.mjs",
);

function isMdxConfigTarget(id: string) {
  const normalized = id.split("?")[0] ?? id;
  return (
    normalized === MDX_RUNTIME_CONFIG ||
    normalized.endsWith("/imprensa/src/docs/mdx/runtime-config.ts") ||
    normalized === MDX_SOURCE ||
    normalized.endsWith("/imprensa/src/docs/mdx.ts") ||
    normalized === MDX_DIST_BUNDLE ||
    normalized.endsWith("/imprensa/dist/docs/mdx.mjs")
  );
}

function injectedMdxRuntimeConfig(options: {
  contentDir: string;
  repo: string;
  repoBranch: string;
  repoPath: string;
  headDefaults: ImprensaOptions["head"];
}) {
  const { contentDir, repo, repoBranch, repoPath, headDefaults } = options;
  return `export const contentDir = ${JSON.stringify(normalizeContentDir(contentDir))};
export const imprensaRepo = ${JSON.stringify(repo)};
export const imprensaRepoBranch = ${JSON.stringify(repoBranch)};
export const imprensaRepoPath = ${JSON.stringify(repoPath)};
export const mdxRawSources = ${JSON.stringify(collectRawMdxSources(process.cwd(), contentDir))};
export const headDefaults = ${JSON.stringify(headDefaults ?? null)};`;
}

function isAppPageFile(file: string, root: string) {
  const relative = path.relative(path.join(root, "src/pages"), file).replace(/\\/g, "/");
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

export function createImprensaVitePlugins(options: ImprensaOptions = {}): PluginOption[] {
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
      name: "imprensa:ilha-pages",
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
    name: "imprensa:html",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        if (!html.includes("imprensa-sidebar-layout-boot")) {
          html = html.replace("</head>", `    ${SIDEBAR_LAYOUT_BOOT_SCRIPT}\n  </head>`);
        }
        return html;
      },
    },
  });
  plugins.push({
    name: "imprensa:html-post",
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
    name: "imprensa:config",
    enforce: "pre",
    resolveId(id) {
      if (id === "imprensa") return "\0imprensa:runtime";
      if (id === "imprensa/shiki") return "\0imprensa:shiki";
      if (id === "imprensa/config") return "\0imprensa:config";
      if (id === CONFIG_STUB || id.endsWith("/imprensa/src/docs/config.ts"))
        return "\0imprensa:config";
      if (id === "imprensa/mdx") return MDX_SOURCE;
      if (id === "imprensa/components") return COMPONENTS_INDEX;
      if (id === "imprensa/doc") return DOC_ENTRY;
      if (id === "imprensa/icons") return ICONS_ENTRY;
      if (id === "imprensa/landing-shiki") return "\0imprensa:landing-shiki";
    },
    async load(id) {
      if (id === "\0imprensa:landing-shiki") {
        return buildLandingShikiModule(process.cwd(), shiki);
      }
      if (id === "\0imprensa:config") {
        return `export const socials = ${JSON.stringify(socials)};
export const preview = ${JSON.stringify(preview)};
export const shiki = ${JSON.stringify(shiki === false ? false : (shiki ?? {}))};
export const hostname = ${JSON.stringify(hostname ?? "")};
export const shikiThemes = ${JSON.stringify(shikiThemes)};`;
      }
      if (id === "\0imprensa:shiki") {
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
      if (id !== "\0imprensa:runtime") return;

      return IMPRENSA_VIRTUAL_RUNTIME.replace("__SHIKI_THEMES__", JSON.stringify(shikiThemes));
    },
    transform(code, id) {
      if (/\.mdx?$/.test(id) && code.startsWith("---")) {
        const end = code.indexOf("\n---", 3);
        if (end !== -1) return { code: code.slice(end + 4), map: null };
      }
      if (!isMdxConfigTarget(id)) return;

      const injected = injectedMdxRuntimeConfig({
        contentDir,
        repo,
        repoBranch,
        repoPath,
        headDefaults,
      });

      if (code.includes(MDX_CONFIG_MARKER)) {
        return code.replace(MDX_CONFIG_MARKER, injected);
      }

      // Prebundled dist/docs/mdx.mjs (dev optimizeDeps) inlines runtime-config without the marker.
      if (/__IMPRENSA_CONTENT_DIR__/.test(code)) {
        return code.replace(
          /\/\/#region src\/docs\/mdx\/runtime-config\.ts[\s\S]*?\/\/#endregion/,
          `//#region src/docs/mdx/runtime-config.ts\n${injected}\n//#endregion`,
        );
      }
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
        optimizeDeps: {
          // Force imprensa/mdx through resolveId → source + transform (not raw dist placeholders).
          exclude: ["imprensa/mdx"],
        },
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
                    name: "imprensa-search",
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
            "imprensa/prerender": IMPRENSA_PRERENDER_ENTRY,
            "imprensa/runtime": IMPRENSA_CLIENT_RUNTIME,
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
