# Maintainer notes — Ilha × Areia × search

- **No VDOM** in Ilha; portaled `Dialog` markup is outside the island morph target.
- **State:** `@ilha/store` (`search-store.ts`) for `open` / `query`.
- **Bridge:** `search-portal-sync.ts` repaints `command-list` in the portal; remove when Areia supports `portal={false}` on body-mounted dialogs with same presence animations.
- **Mount:** `ensureGlobalSearchMounted()` in `createImprensa().init()` — do not duplicate search in layouts.
