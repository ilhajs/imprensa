/**
 * Areia Dialog portals to document.body; Ilha does not morph that subtree.
 * Syncs command-list + keyboard nav until Areia supports portal={false} on body hosts.
 */
import { Command as CommandPrimitive } from "@areia/slots";
import { getMatchedExcerpt, getSearchResults, type SearchResult } from "./search-core";

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function highlightPlain(text: string, query: string) {
  const terms = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1);
  if (terms.length === 0) return escapeHtml(text);
  const pattern = new RegExp(
    `(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi",
  );
  return text
    .split(pattern)
    .map((part) =>
      terms.includes(part.toLowerCase())
        ? `<mark class="rounded bg-areia-primary px-0.5 text-areia-primary-foreground">${escapeHtml(part)}</mark>`
        : escapeHtml(part),
    )
    .join("");
}

export function findOpenSearchCommandRoot(): HTMLElement | null {
  const portal = document.querySelector('[data-slot="dialog-portal"][data-state="open"]');
  if (portal) {
    const inPortal = portal.querySelector<HTMLElement>(
      '[data-imprensa-search-dialog][data-slot="command"]',
    );
    if (inPortal) return inPortal;
  }
  return document.querySelector<HTMLElement>('[data-imprensa-search-dialog][data-slot="command"]');
}

function findListIn(root: HTMLElement | null): HTMLElement | null {
  if (!root) return null;
  return root.querySelector('[data-slot="command-list"]');
}

function findInputIn(root: HTMLElement | null): HTMLInputElement | null {
  if (!root) return null;
  return root.querySelector("[data-search-input]");
}

export function syncPortaledSearchList(
  query: string,
  results: SearchResult[],
  root?: HTMLElement | null,
) {
  const commandRoot = root ?? findOpenSearchCommandRoot();
  const list = findListIn(commandRoot);
  if (!list) return false;

  const trimmed = query.trim();
  if (!trimmed) {
    list.classList.add("hidden");
    list.innerHTML = "";
    return true;
  }

  list.classList.remove("hidden");

  if (results.length === 0) {
    list.innerHTML = `<div data-slot="command-group">
      <div data-slot="command-group-heading" class="px-3 py-1 text-xs font-medium text-areia-foreground/60">Pages</div>
      <div data-slot="command-empty" class="px-3 py-6 text-center text-sm text-areia-foreground/60">No results found.</div>
    </div>`;
    return true;
  }

  const items = results
    .map((result) => {
      const excerpt = getMatchedExcerpt(result.text, query);
      const titleHtml = highlightPlain(result.title, query);
      const excerptHtml = excerpt
        ? `<div class="mt-1 line-clamp-2 text-xs text-areia-foreground/60">${highlightPlain(excerpt, query)}</div>`
        : "";
      return `<div data-slot="command-item" data-value="${escapeHtml(result.path)}" data-keywords="${escapeHtml(`${result.title}\n${result.text}`)}" class="cursor-pointer rounded-lg px-3 py-2 text-sm data-selected:bg-areia-control-hover">
        <div class="font-medium">${titleHtml}</div>
        ${excerptHtml}
      </div>`;
    })
    .join("");

  list.innerHTML = `<div data-slot="command-group">
    <div data-slot="command-group-heading" class="px-3 py-1 text-xs font-medium text-areia-foreground/60">Pages</div>
    ${items}
  </div>`;
  return true;
}

export type PortaledSearchBridgeOptions = {
  isOpen: () => boolean;
  getQuery: () => string;
  setQuery: (value: string) => void;
  onClose: () => void;
  onNavigate: (path: string) => void;
};

function syncInputFromSaved(root: HTMLElement, saved: string) {
  const input = findInputIn(root);
  if (input && input.value !== saved) input.value = saved;
}

function searchDialogOpenInDom(): boolean {
  return findOpenSearchCommandRoot() !== null;
}

export function attachPortaledSearchBridge(options: PortaledSearchBridgeOptions) {
  const { isOpen, getQuery, setQuery, onClose, onNavigate } = options;
  let commandDestroy = () => {};
  let commandRoot: HTMLElement | null = null;

  const repaint = (query: string, root?: HTMLElement | null) => {
    syncPortaledSearchList(query, getSearchResults(query), root ?? findOpenSearchCommandRoot());
  };

  const ensureCommand = (root: HTMLElement) => {
    if (root === commandRoot) return;
    commandDestroy();
    commandRoot = root;
    const saved = getQuery();
    syncInputFromSaved(root, saved);
    const controller = CommandPrimitive.createCommand(root, {
      label: "Search documentation",
      loop: true,
      shouldFilter: false,
      onSearchChange: (value: string) => {
        setQuery(value);
        repaint(value, root);
      },
      onSelect: (value: string) => {
        onClose();
        onNavigate(value);
      },
    });
    commandDestroy = () => controller.destroy();
    repaint(saved, root);
    findInputIn(root)?.focus();
  };

  const active = () => isOpen() || searchDialogOpenInDom();

  const handleQueryFromInput = (input: HTMLInputElement) => {
    if (!input.closest("[data-imprensa-search-dialog]")) return;
    const root = input.closest<HTMLElement>('[data-slot="command"]');
    if (!root) return;
    const query = input.value;
    setQuery(query);
    repaint(query, root);
    ensureCommand(root);
  };

  const onInput = (event: Event) => {
    if (!active()) return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.matches("[data-search-input]")) return;
    handleQueryFromInput(target);
  };

  const onClick = (event: MouseEvent) => {
    if (!active()) return;
    const item = (event.target as Element | null)?.closest<HTMLElement>(
      '[data-slot="command-item"]',
    );
    if (!item?.closest("[data-imprensa-search-dialog]")) return;
    const path = item.getAttribute("data-value");
    if (!path) return;
    event.preventDefault();
    onClose();
    onNavigate(path);
  };

  document.addEventListener("input", onInput, true);
  document.addEventListener("click", onClick, true);

  const tick = () => {
    if (!active()) {
      if (commandRoot) {
        commandDestroy();
        commandDestroy = () => {};
        commandRoot = null;
      }
      return;
    }
    const root = findOpenSearchCommandRoot();
    if (!root) return;
    const saved = getQuery();
    syncInputFromSaved(root, saved);
    ensureCommand(root);
    repaint(saved, root);
  };

  const interval = window.setInterval(tick, 50);
  tick();

  return () => {
    window.clearInterval(interval);
    document.removeEventListener("input", onInput, true);
    document.removeEventListener("click", onClick, true);
    commandDestroy();
    commandRoot = null;
  };
}

export function onSearchPortalMounted(container: HTMLElement, getSavedQuery: () => string) {
  const root = container.querySelector<HTMLElement>(
    '[data-imprensa-search-dialog][data-slot="command"]',
  );
  if (!root) return;
  const input = findInputIn(root);
  const query = getSavedQuery();
  if (input) input.value = query;
  syncPortaledSearchList(query, getSearchResults(query), root);
  input?.focus();
  if (query.length > 0) {
    requestAnimationFrame(() => {
      input?.setSelectionRange(query.length, query.length);
    });
  }
}
