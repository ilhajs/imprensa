import MiniSearch from "minisearch";
import { searchDocuments } from "imprensa/mdx";

type SearchDocument = (typeof searchDocuments)[number];
export type SearchResult = Pick<SearchDocument, "id" | "title" | "path" | "text">;

const searchIndex = new MiniSearch<SearchDocument>({
  fields: ["title", "text"],
  storeFields: ["title", "path", "text"],
  searchOptions: { boost: { title: 3 }, fuzzy: 0.2, prefix: true },
});
searchIndex.addAll(searchDocuments);

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

export function getSearchResults(query: string): SearchResult[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];
  return searchIndex
    .search(trimmedQuery)
    .slice(0, 8)
    .map((result) => ({
      id: result.id,
      title: result.title,
      path: result.path,
      text: result.text,
    }));
}
