/** @jsxImportSource ilha */
import { Command as CommandPrimitive } from "@areia/slots";
import { Dialog, Icon } from "areia";
import ilha from "ilha";
import { Search, X } from "lucide";
import MiniSearch from "minisearch";
import { each, when } from "quando";
import { searchDocuments } from "luzpress/mdx";

type SearchDocument = (typeof searchDocuments)[number];
type SearchResult = Pick<SearchDocument, "id" | "title" | "path" | "text">;

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

function getMatchedExcerpt(text: string, query: string) {
  const firstMatch = getTextMatchIndex(text, query);
  if (firstMatch === undefined) return undefined;
  const start = Math.max(0, firstMatch - 60);
  const end = Math.min(text.length, firstMatch + 140);
  const excerpt = text.slice(start, end).trim();
  return `${start > 0 ? "…" : ""}${excerpt}${end < text.length ? "…" : ""}`;
}

function highlightQuery(text: string, query: string) {
  const terms = getQueryTerms(query).filter((term) => term.length > 1);
  if (terms.length === 0) return text;
  const pattern = new RegExp(
    `(${terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi",
  );
  return text
    .split(pattern)
    .map((part) =>
      terms.includes(part.toLowerCase()) ? (
        <mark class="rounded bg-areia-primary px-0.5 text-areia-primary-foreground">{part}</mark>
      ) : (
        part
      ),
    );
}

function getSearchResults(query: string): SearchResult[] {
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

function closeDialogFromContent(root: HTMLElement) {
  root.querySelector<HTMLButtonElement>("[data-search-close]")?.click();
}

export const SearchDialogContent = ilha
  .state("query", "")
  .derived("results", ({ state }) => getSearchResults(state.query()))
  .onMount(({ host, state }) => {
    const root = host.matches('[data-slot="command"]')
      ? (host as HTMLElement)
      : host.querySelector<HTMLElement>('[data-slot="command"]');
    if (!root) return;
    const controller = CommandPrimitive.createCommand(root, {
      label: "Search documentation",
      loop: true,
      shouldFilter: false,
      onSearchChange: (value: string) => state.query(value),
      onSelect: (value: string) => {
        closeDialogFromContent(root);
        window.location.assign(value);
      },
    });
    return () => controller.destroy();
  })
  .effect(({ host, derived, state }) => {
    const root = host.matches('[data-slot="command"]')
      ? (host as HTMLElement)
      : host.querySelector<HTMLElement>('[data-slot="command"]');
    if (!root) return;
    const firstResult = state.query().trim() ? ((derived.results() ?? [])[0]?.path ?? null) : null;
    const frame = requestAnimationFrame(() => {
      root.dispatchEvent(new CustomEvent("command:set", { detail: { value: firstResult } }));
    });
    return () => cancelAnimationFrame(frame);
  })
  .render(({ derived, state }) => (
    <div data-slot="command" data-label="Search documentation">
      <div
        data-slot="command-input-wrapper"
        class="flex h-12 items-center gap-2 border-b border-areia-border px-3"
      >
        <Icon icon={Search} class="size-4 shrink-0 text-areia-foreground/60" />
        <input
          data-slot="command-input"
          autofocus
          placeholder="Search documentation..."
          class="h-full flex-1 bg-transparent text-sm leading-none outline-none"
        />
        <Dialog.Close>
          <button
            data-search-close
            type="button"
            class="flex size-7 items-center justify-center rounded-md hover:bg-areia-control-hover"
          >
            <Icon icon={X} class="size-4" />
          </button>
        </Dialog.Close>
      </div>
      <div
        data-slot="command-list"
        class={`max-h-96 overflow-y-auto p-2 ${when(!state.query().trim(), () => "hidden") ?? ""}`}
      >
        {when(state.query().trim(), () => (
          <div data-slot="command-group">
            <div
              data-slot="command-group-heading"
              class="px-3 py-1 text-xs font-medium text-areia-foreground/60"
            >
              Pages
            </div>
            {each(derived.results() ?? [])
              .as((result) => {
                const excerpt = getMatchedExcerpt(result.text, state.query());
                return (
                  <div
                    data-slot="command-item"
                    data-value={result.path}
                    data-keywords={`${result.title}\n${result.text}`}
                    class="cursor-pointer rounded-lg px-3 py-2 text-sm data-selected:bg-areia-control-hover"
                  >
                    <div class="font-medium">{result.title}</div>
                    {when(excerpt, (matchedExcerpt) => (
                      <div class="mt-1 line-clamp-2 text-xs text-areia-foreground/60">
                        {highlightQuery(matchedExcerpt, state.query())}
                      </div>
                    ))}
                  </div>
                );
              })
              .else(() => (
                <div
                  data-slot="command-empty"
                  class="px-3 py-6 text-center text-sm text-areia-foreground/60"
                >
                  No results found.
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  ));
