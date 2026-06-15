# Changelog

## 0.1.0-alpha.0

### Added

- `imprensa()` Vite plugin: MDX, Ilha pages, Tailwind, prerender, sitemap, llms.txt
- Docs UI: resizable sidebar, theme toggle, global search (Areia Dialog + MiniSearch)
- `@ilha/store` for search `open` / `query` with `store.bind()` for `bind:open`
- Shiki / twoslash build pipeline, dead-link rehype (optional)

### Notes

- Portaled search dialog uses a small DOM bridge (`search-portal-sync`) until Areia `portal={false}` or equivalent
- `SearchOverlay` island is a no-op registry stub; real UI is `GlobalSearch` on `document.body`
