import type MiniSearch from "minisearch";
import type { SearchDocument } from "imprensa/mdx";

export type SearchResult = Pick<SearchDocument, "id" | "title" | "path" | "text">;

// minisearch and the indexed document text load on first search interaction,
// not at startup — keeps the initial bundle/CPU cost off the critical path.
let searchIndex: MiniSearch<SearchDocument> | null = null;
let warmPromise: Promise<void> | null = null;

export function isSearchIndexReady() {
  return searchIndex !== null;
}

export function warmSearchIndex(): Promise<void> {
  warmPromise ??= Promise.all([import("minisearch"), import("imprensa/mdx")]).then(
    ([{ default: MiniSearchCtor }, { searchDocuments }]) => {
      const index = new MiniSearchCtor<SearchDocument>({
        fields: ["title", "text"],
        storeFields: ["title", "path", "text"],
        searchOptions: { boost: { title: 3 }, fuzzy: 0.2, prefix: true },
      });
      index.addAll(searchDocuments);
      searchIndex = index;
    },
  );
  return warmPromise;
}

function getQueryTerms(query: string) {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function getTextMatchIndex(text: string, query: string) {
  const normalizedText = text.toLowerCase();
  return getQueryTerms(query)
    .map((term) => normalizedText.indexOf(term))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
}

export function getMatchedExcerpt(text: string, query: string) {
  const firstMatch = getTextMatchIndex(text, query);
  if (firstMatch === undefined) return undefined;
  const start = Math.max(0, firstMatch - 60);
  const end = Math.min(text.length, firstMatch + 140);
  const excerpt = text.slice(start, end).trim();
  return `${start > 0 ? "…" : ""}${excerpt}${end < text.length ? "…" : ""}`;
}

/** Returns [] while the index is still warming; callers repaint via warmSearchIndex(). */
export function getSearchResults(query: string, limit = 8): SearchResult[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];
  if (!searchIndex) {
    void warmSearchIndex();
    return [];
  }
  return searchIndex
    .search(trimmedQuery)
    .slice(0, limit)
    .map((result) => ({
      id: result.id,
      title: result.title,
      path: result.path,
      text: result.text,
    }));
}
