/** @jsxImportSource ilha */
import { Command as CommandPrimitive } from "@areia/slots";
import { Icon } from "areia";
import { Search, X } from "lucide";
import { each, when } from "quando";
import type { SearchResult } from "./search-core";
import { getMatchedExcerpt, highlightQuery } from "./search-core";

export type SearchDialogState = {
  dialogOpen: (v?: boolean) => boolean;
  query: (v?: string) => string;
};

export function closeSearchDialog(state: SearchDialogState) {
  state.dialogOpen(false);
  state.query("");
}

export function mountSearchCommand(host: Element, state: SearchDialogState, onClose: () => void) {
  const root = host.querySelector<HTMLElement>('[data-slot="command"]');
  const input = host.querySelector<HTMLInputElement>("[data-search-input]");
  input?.focus();
  if (!root) return () => {};
  const controller = CommandPrimitive.createCommand(root, {
    label: "Search documentation",
    loop: true,
    shouldFilter: false,
    onSearchChange: (value: string) => state.query(value),
    onSelect: (value: string) => {
      onClose();
      window.location.assign(value);
    },
  });
  return () => controller.destroy();
}

export function SearchDialogPanel(props: { state: SearchDialogState; results: SearchResult[] }) {
  const { state, results } = props;
  return (
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        data-search-backdrop
        class="absolute inset-0 bg-areia-background/10 backdrop-blur-sm"
        aria-label="Close search"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search documentation"
        class="relative z-10 w-full max-w-lg min-w-[min(100%,32rem)] overflow-hidden rounded-xl border border-areia-border bg-areia-background text-areia-default shadow-lg outline outline-1 outline-areia-divider"
      >
        <div data-slot="command" data-label="Search documentation">
          <div
            data-slot="command-input-wrapper"
            class="flex h-12 items-center gap-2 border-b border-areia-border px-3"
          >
            <Icon icon={Search} class="size-4 shrink-0 text-areia-foreground/60" />
            <input
              data-search-input
              data-slot="command-input"
              type="search"
              autocomplete="off"
              spellcheck={false}
              value={state.query()}
              placeholder="Search documentation..."
              class="h-full flex-1 bg-transparent text-sm leading-none outline-none"
            />
            <button
              data-search-close
              type="button"
              class="flex size-7 items-center justify-center rounded-md hover:bg-areia-control-hover"
              aria-label="Close search"
            >
              <Icon icon={X} class="size-4" />
            </button>
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
                {each(results)
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
      </div>
    </div>
  );
}
