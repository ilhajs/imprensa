# Luz Starter

A documentation site template powered by [luzpress](https://github.com/ilhajs/luz/tree/main/packages/luzpress), [Ilha](https://ilha.build), and [Areia](https://github.com/ilhajs/areia).

## Requirements

- Node.js 20+ or Bun

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:5173.

### Scaffold from GitHub

```bash
npx giget@latest gh:ilhajs/luz/templates/starter my-docs
cd my-docs
npm install
npm run dev
```

## Scripts

```bash
npm run dev      # start dev server
npm run build    # prerender + typecheck
npm run preview  # preview production build
npm run lint     # oxlint
```

## Project structure

```text
src/
  main.ts                 # client entry + prerender export
  app.css                 # branding tokens + luzpress styles
  pages/
    index.tsx             # landing page (top bar layout)
    +layout.tsx           # root shell
    (content)/            # MDX docs (sidebar layout)
      +layout.tsx
      [...slug].tsx       # MDX renderer
      getting-started.mdx
      guide/writing.mdx
  lib/components/         # app-specific UI
public/                   # logo, icons
```

## Layouts

Two chrome patterns ship by default:

- **Landing (`/`)** — `Topbar` with logo, search, theme toggle, GitHub link
- **Docs (`/getting-started`, etc.)** — resizable `Sidebar` with the same controls plus navigation tree

Customize or merge these in `src/lib/components/`.

## Writing docs

Add MDX files under `src/pages/(content)/`. The `(content)` segment is a route group — it does not appear in URLs.

Add optional frontmatter to control navigation, search, SEO, and AI exports:

```mdx
---
title: Getting Started
description: Create a Luz documentation site.
order: 1
tags: [setup, starter]
---
```

Build-time checks (enabled by default):

- Exactly one `h1` per page
- `h1` text should match the visible page title
- No skipped heading levels
- No dead internal links or anchor references

Disable with `detectDeadLink: false` in `vite.config.ts` while migrating content.

## Customization checklist

1. **Brand color** — set `--areia-primary` in `src/app.css`
2. **Logo** — replace `public/logo.svg`
3. **Site name** — edit `LogoButton` text via a custom component, or fork from `luzpress/components`
4. **GitHub link** — update `src/lib/components/topbar.tsx`
5. **Landing copy** — edit `src/pages/index.tsx`
6. **Footer** — edit `src/lib/components/footer.tsx`

## Plugin configuration

```ts
// vite.config.ts
luzpress({
  repo: "https://github.com/org/repo",
  repoPath: "templates/starter", // optional monorepo prefix
  contentDir: "src/pages/(content)",
  shiki: {
    themes: { light: "night-owl-light", dark: "houston" },
    langs: ["ts", "mdx", "shell"],
  },
});
```

Content pages use `DocArticle` from `luzpress/doc` (already wired in `[...slug].tsx`) to show **Copy Markdown** and an **Open** menu above the page title.

## Dependencies

The starter only declares packages you import directly (`areia`, `ilha`, `lucide`, `shiki`). Everything else — MDX pipeline, Tailwind, prerender, search internals — comes through `luzpress`.

## LLM exports

Each production build writes:

- `dist/<route>/index.md` — raw source alongside `index.html`
- `dist/llms.txt` — site outline with links and descriptions for each doc
- `dist/llms-full.txt` — full concatenated doc content
- `dist/llms.json` — structured page metadata for agents and tooling

Disable with `llms: false` in `vite.config.ts`, or customize the outline:

```ts
luzpress({
  llms: {
    siteName: "My Docs",
    summary: "API and guides for My Product.",
    section: "Documentation",
  },
});
```
