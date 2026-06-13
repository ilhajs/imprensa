import fs from "node:fs";
import path from "node:path";

export function normalizeContentDirPhysical(root: string, dir: string) {
  const trimmed = dir.replace(/^\/+|\/+$/g, "").replace(/^src\//, "");
  return path.join(root, "src", trimmed);
}

export function normalizeContentDir(dir: string) {
  const trimmed = dir.replace(/^\/+|\/+$/g, "").replace(/^src\//, "");
  return `/src/${trimmed}/`;
}

export function filePathToRoutePathFromDisk(filePath: string, contentDirPhysical: string) {
  const relative = path
    .relative(contentDirPhysical, filePath)
    .replace(/\\/g, "/")
    .replace(/\.mdx?$/, "")
    .replace(/\/index$/, "");

  if (!relative || relative === "index") return "/";
  return `/${relative}`;
}

export function collectRawMdxSources(root: string, contentDirOption: string) {
  const contentDirPhysical = normalizeContentDirPhysical(root, contentDirOption);
  if (!fs.existsSync(contentDirPhysical)) return {} as Record<string, string>;

  const sources: Record<string, string> = {};

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
        continue;
      }

      if (!/\.mdx?$/.test(entry.name)) continue;
      sources[filePathToRoutePathFromDisk(entryPath, contentDirPhysical)] = fs.readFileSync(
        entryPath,
        "utf8",
      );
    }
  }

  walk(contentDirPhysical);
  return sources;
}

export function collectMdxRoutes(contentDirOption: string, root = process.cwd()): string[] {
  const contentDirPhysical = normalizeContentDirPhysical(root, contentDirOption);
  if (!fs.existsSync(contentDirPhysical)) return [];

  const routes: string[] = [];

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
        continue;
      }
      if (!/\.mdx?$/.test(entry.name)) continue;
      routes.push(filePathToRoutePathFromDisk(entryPath, contentDirPhysical));
    }
  }

  walk(contentDirPhysical);
  return routes;
}
