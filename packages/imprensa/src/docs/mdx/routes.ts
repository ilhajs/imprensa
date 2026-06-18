import { buildContentTreeFromSources } from "../../core/content-tree";
import type { MdxModule } from "./types";
import { metaFromDocument, textFromRawDocument } from "./document-text";
import type { ContentMeta, SearchDocument } from "./types";
import { contentDir, mdxRawSources, order as configOrder } from "./runtime-config";

import { mdxIslandLoaders, mdxIslandSequences } from "./islands";

export { mdxIslandLoaders, mdxIslandSequences };

declare const __IMPRENSA_MDX_MODULES__: Record<string, () => Promise<MdxModule>>;

const allMdxModules = __IMPRENSA_MDX_MODULES__;

export const mdxModules = Object.fromEntries(
  Object.entries(allMdxModules).filter(([filePath]) => filePath.startsWith(contentDir)),
);

export function filePathToRoutePath(filePath: string) {
  const routePath = filePath
    .replace(/^\/src\/pages/, "")
    .replace(/\.mdx?$/, "")
    .replace(/\/index$/, "")
    .split("/")
    .filter((segment) => !/^\(.+\)$/.test(segment))
    .join("/");

  return routePath || "/";
}

export const contentMeta = Object.fromEntries(
  Object.entries(mdxModules).map(([filePath]) => {
    const path = filePathToRoutePath(filePath);
    return [path, metaFromDocument(filePath, mdxRawSources[path] ?? "")];
  }),
) as Record<string, ContentMeta>;

export const mdxPages = new Map(
  Object.entries(mdxModules)
    .map(([filePath, loader]) => [filePathToRoutePath(filePath), loader] as const)
    .filter(([path]) => contentMeta[path]?.type !== "link"),
);

export const contentTree = buildContentTreeFromSources(
  mdxRawSources,
  (routePath) => {
    const key = Object.keys(mdxModules).find((fp) => filePathToRoutePath(fp) === routePath);
    return key ?? `/src/pages${routePath === "/" ? "" : routePath}.mdx`;
  },
  configOrder,
);

export const searchDocuments = Object.entries(mdxModules)
  .map<SearchDocument | undefined>(([filePath]) => {
    const path = filePathToRoutePath(filePath);
    const meta = contentMeta[path];
    if (meta.draft || meta.type === "link") return undefined;

    return {
      id: path,
      title: meta.title,
      path,
      description: meta.description,
      tags: meta.tags,
      text: [meta.description, meta.tags.join(" "), textFromRawDocument(mdxRawSources[path] ?? "")]
        .filter(Boolean)
        .join(" "),
    };
  })
  .filter((doc): doc is SearchDocument => Boolean(doc));

export const mdxRoutes = [...mdxPages.keys()];
