import path from "node:path";
import { buildContentTreeFromSources } from "../../core/content-tree";
import { collectRawMdxSources, normalizeContentDirPhysical } from "../../core/routes";

export function isContentTreeSourceFile(file: string, root: string, contentDirOption: string) {
  const normalized = file.split("?")[0] ?? file;
  if (!/\.(mdx?|json)$/i.test(normalized)) return false;
  const contentPhysical = normalizeContentDirPhysical(root, contentDirOption);
  const rel = path.relative(contentPhysical, normalized).replace(/\\/g, "/");
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    const underPages = path.relative(path.join(root, "src/pages"), normalized).replace(/\\/g, "/");
    if (underPages.startsWith("..")) return false;
    return /\.(mdx?|json)$/i.test(underPages);
  }
  return true;
}

export function loadContentTreeModuleSource(
  root: string,
  contentDirOption: string,
  configOrder?: Record<string, number>,
): string {
  const contentPhysical = normalizeContentDirPhysical(root, contentDirOption);
  const sources = collectRawMdxSources(root, contentDirOption);
  const tree = buildContentTreeFromSources(
    sources,
    (routePath) => {
      const rel =
        routePath === "/" ? "index.mdx" : `${routePath.slice(1).replace(/\//g, path.sep)}.mdx`;
      return path.join(contentPhysical, rel);
    },
    configOrder,
  );
  return `export const contentTree = ${JSON.stringify(tree)};\n`;
}
