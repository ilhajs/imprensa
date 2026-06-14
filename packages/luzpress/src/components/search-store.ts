import { createStore } from "@ilha/store";

export type LuzSearchState = {
  open: boolean;
  query: string;
};

export const searchStore = createStore<LuzSearchState>({
  open: false,
  query: "",
});

/** Hoisted for `bind:open` / portaled bridge — same alien-signals graph as islands. */
export const searchOpen = searchStore.bind((s) => s.open);
export const searchQuery = searchStore.bind((s) => s.query);

export function closeSearch() {
  searchOpen(false);
}

export function openSearch() {
  searchOpen(true);
}

export function toggleSearch() {
  if (searchOpen()) closeSearch();
  else openSearch();
}

/** Legacy alias for store bind accessors (optional app code). */
export type SearchBindAccessors = {
  dialogOpen: typeof searchOpen;
  query: typeof searchQuery;
};
