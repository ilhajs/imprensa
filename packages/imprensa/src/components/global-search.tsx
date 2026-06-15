/** @jsxImportSource ilha */
import { Dialog, Icon } from "areia";
import ilha from "ilha";
import { Search, X } from "lucide";
import { closeSearch, openSearch, searchOpen, searchQuery, toggleSearch } from "./search-store";
import { attachPortaledSearchBridge, onSearchPortalMounted } from "./search-portal-sync";

const HOST_ID = "imprensa-global-search-host";

function syncSearchHostVisibility(open = searchOpen()) {
  document.getElementById(HOST_ID)?.toggleAttribute("hidden", !open);
}

function mountSearchShortcuts() {
  const onTriggerClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest("[data-search-trigger]")) return;
    event.preventDefault();
    event.stopPropagation();
    openSearch();
  };

  const onKeydown = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      toggleSearch();
      return;
    }
    if (event.key === "Escape" && searchOpen()) {
      event.preventDefault();
      closeSearch();
    }
  };

  document.addEventListener("click", onTriggerClick, true);
  window.addEventListener("keydown", onKeydown);
  return () => {
    document.removeEventListener("click", onTriggerClick, true);
    window.removeEventListener("keydown", onKeydown);
  };
}

export const GlobalSearch = ilha
  .effect(() => {
    const open = searchOpen();
    syncSearchHostVisibility(open);
    if (!open) return;
    let tries = 0;
    const restore = () => {
      const portal = document.querySelector<HTMLElement>(
        '[data-slot="dialog-portal"][data-state="open"]',
      );
      if (portal) {
        onSearchPortalMounted(portal, searchQuery);
        return;
      }
      if (++tries < 24) requestAnimationFrame(restore);
    };
    requestAnimationFrame(restore);
  })
  .onMount(() => {
    const unlisten = mountSearchShortcuts();
    const detachBridge = attachPortaledSearchBridge({
      isOpen: searchOpen,
      getQuery: searchQuery,
      setQuery: (value) => searchQuery(value),
      onClose: closeSearch,
      onNavigate: (path) => window.location.assign(path),
    });
    return () => {
      unlisten();
      detachBridge();
    };
  })
  .render(() => (
    <Dialog
      bind:open={searchOpen as never}
      closeOnClickOutside
      closeOnEscape
      lockScroll
      onOpenChange={(open: boolean) => {
        if (!open) closeSearch();
      }}
      onPortalMounted={(container) => onSearchPortalMounted(container, searchQuery)}
    >
      <Dialog.Trigger as="button" type="button" class="sr-only" tabIndex={-1} aria-hidden="true">
        Search
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay class="backdrop-blur-sm" />
        <Dialog.Content size="lg" class="grid gap-0 p-0 min-w-[min(100%,32rem)]">
          <div data-imprensa-search-dialog data-slot="command" data-label="Search documentation">
            <Dialog.Title class="sr-only">Search documentation</Dialog.Title>
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
                placeholder="Search documentation..."
                class="h-full flex-1 bg-transparent text-sm leading-none outline-none"
              />
              <Dialog.Close
                as="button"
                type="button"
                class="flex size-7 items-center justify-center rounded-md hover:bg-areia-control-hover"
                aria-label="Close search"
              >
                <Icon icon={X} class="size-4" />
              </Dialog.Close>
            </div>
            <div data-slot="command-list" class="max-h-96 overflow-y-auto p-2 hidden" />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  ));

let globalSearchUnmount: (() => void) | undefined;

export function ensureGlobalSearchMounted() {
  if (typeof document === "undefined" || globalSearchUnmount) return;

  let host = document.getElementById(HOST_ID);
  if (!host) {
    host = document.createElement("div");
    host.id = HOST_ID;
    host.hidden = true;
    document.body.appendChild(host);
  }

  syncSearchHostVisibility(false);

  const result = GlobalSearch.mount(host);
  globalSearchUnmount = typeof result === "function" ? result : () => {};
}
