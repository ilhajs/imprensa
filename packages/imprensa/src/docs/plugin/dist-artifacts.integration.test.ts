import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyMdxConfigInjection,
  injectMdxIslandMaps,
  injectedMdxRuntimeConfig,
  isMdxConfigTarget,
  isMdxIslandsTarget,
} from "./create-plugins";
import type { MdxManifest } from "./mdx-manifest";

// Guards the published-package contract: the plugin's transform hooks rewrite the
// *built* dist bundles by regex/marker matching. If a tsdown/rolldown bump changes
// the output shape (region comments, placeholder names, chunk naming), these tests
// fail instead of consumers getting silently un-injected bundles.

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const distDir = path.join(pkgRoot, "dist");
const mdxBundle = path.join(distDir, "docs/mdx.mjs");

const hasDist = fs.existsSync(mdxBundle);
const maybe = hasDist ? describe : describe.skip;

const manifest: MdxManifest = {
  moduleMap: `({ "/src/pages/(content)/index.mdx": () => import("/src/pages/(content)/index.mdx") })`,
  islands: `({ "/guide": ["Snippet"] })`,
  sequences: `({ "/guide": ["Snippet"] })`,
  rawSources: { "/": "# Home" },
};

maybe("dist artifacts injection contract", () => {
  const injected = injectedMdxRuntimeConfig({
    contentDir: "src/pages/(content)",
    repo: "https://github.com/org/repo",
    repoBranch: "main",
    repoPath: "",
    headDefaults: null,
    order: {},
    rawSources: manifest.rawSources,
  });

  test("dist/docs/mdx.mjs keeps the runtime-config region and module placeholder", () => {
    const code = fs.readFileSync(mdxBundle, "utf8");
    expect(code).toMatch(/\/\/#region src\/docs\/mdx\/runtime-config\.ts[\s\S]*?\/\/#endregion/);
    expect(code).toContain("__IMPRENSA_MDX_MODULES__");

    const next = applyMdxConfigInjection(code, injected, manifest);
    expect(next).not.toBe(code);
    expect(next).not.toContain("__IMPRENSA_MDX_MODULES__");
    expect(next).toContain(`const mdxRawSources = {"/":"# Home"}`);
  });

  test("dist island chunk keeps island placeholders and matches target predicate", () => {
    const islandChunks = fs
      .readdirSync(distDir)
      .filter((file) => /^islands-[^/]+\.mjs$/.test(file))
      .map((file) => path.join(distDir, file));
    expect(islandChunks.length).toBeGreaterThan(0);

    for (const chunk of islandChunks) {
      expect(isMdxIslandsTarget(chunk)).toBe(true);
      const code = fs.readFileSync(chunk, "utf8");
      expect(code).toContain("__IMPRENSA_MDX_ISLANDS__");
      expect(code).toContain("__IMPRENSA_MDX_ISLAND_SEQUENCES__");

      const next = injectMdxIslandMaps(code, manifest);
      expect(next).not.toContain("__IMPRENSA_MDX_ISLANDS__");
      expect(next).not.toContain("__IMPRENSA_MDX_ISLAND_SEQUENCES__");
    }
  });

  test("resolution predicates accept dist and source entry paths", () => {
    expect(isMdxConfigTarget(mdxBundle)).toBe(true);
    expect(isMdxConfigTarget(path.join(pkgRoot, "src/docs/mdx.ts"))).toBe(true);
    expect(isMdxConfigTarget(`${mdxBundle}?v=123`)).toBe(true);
    expect(isMdxConfigTarget("/some/app/src/pages/index.tsx")).toBe(false);
    expect(isMdxIslandsTarget(path.join(distDir, "docs/mdx-islands.mjs"))).toBe(true);
    expect(isMdxIslandsTarget("/some/app/dist/other.mjs")).toBe(false);
  });

  test("published exports map points at files that exist in dist", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(pkgRoot, "package.json"), "utf8")) as {
      exports: Record<string, string | Record<string, unknown>>;
      files: string[];
    };
    const collectPaths = (value: unknown): string[] => {
      if (typeof value === "string") return [value];
      if (value && typeof value === "object") return Object.values(value).flatMap(collectPaths);
      return [];
    };
    for (const target of collectPaths(pkg.exports)) {
      expect(fs.existsSync(path.join(pkgRoot, target))).toBe(true);
    }
    for (const entry of pkg.files) {
      if (entry.includes("*")) continue;
      expect(fs.existsSync(path.join(pkgRoot, entry))).toBe(true);
    }
  });
});
