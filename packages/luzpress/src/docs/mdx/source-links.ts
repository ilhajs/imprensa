import { filePathToRoutePath, mdxModules } from "./routes";
import {
  luzpressRepo,
  luzpressRepoBranch,
  luzpressRepoPath,
  mdxRawSources,
} from "./runtime-config";

function routeToDistMarkdown(routePath: string) {
  if (routePath === "/") return "/index.md";
  return `${routePath}/index.md`;
}

function normalizeRepoUrl(repo: string) {
  const trimmed = repo.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//.test(trimmed)) return trimmed.replace(/\/$/, "");
  return `https://${trimmed.replace(/\/$/, "")}`;
}

export function getMdxSourceForRoute(routePath: string) {
  const normalized = routePath.replace(/\/$/, "") || "/";

  for (const filePath of Object.keys(mdxModules)) {
    if (filePathToRoutePath(filePath) !== normalized) continue;

    const ext = filePath.match(/\.mdx?$/)?.[0] ?? ".mdx";
    const sourceFile = filePath.replace(/^\//, "");

    return {
      routePath: normalized,
      sourceFile,
      markdownUrl: routeToDistMarkdown(normalized),
      ext,
    };
  }

  return undefined;
}

export function getDocLinks(routePath: string) {
  const source = getMdxSourceForRoute(routePath);
  if (!source) return undefined;

  const repo = normalizeRepoUrl(luzpressRepo);
  const branch = luzpressRepoBranch || "main";
  const repoPath = (luzpressRepoPath ?? "").replace(/^\/+|\/+$/g, "");
  const githubFile = repoPath ? `${repoPath}/${source.sourceFile}` : source.sourceFile;

  return {
    routePath: source.routePath,
    markdownUrl: source.markdownUrl,
    githubUrl: repo ? `${repo}/blob/${branch}/${githubFile}` : undefined,
    rawMarkdown: mdxRawSources[source.routePath],
  };
}
