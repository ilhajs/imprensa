# Luz

Luz is a simple documentation starter built with Ilha and Vite.

It includes a basic home page, MDX content pages, shared layout components, search, and Areia UI styles.

## Requirements

- Bun, or Node.js 20+

## Getting started

Install dependencies:

```bash
bun install
```

Start the development server:

```bash
bun run dev
```

Open http://localhost:5173 in your browser.

## Scripts

```bash
bun run dev      # start the dev server
bun run build    # type-check and build the site
bun run preview  # preview the production build
```

## Project structure

```text
src/
  pages/          # routes and MDX content
  lib/            # shared components and helpers
  main.ts         # client entry
  app.css         # global styles
public/           # static assets
```

## Notes

- Edit pages in `src/pages/`.
- Add shared UI in `src/lib/components/`.
- Production output is written to `dist/`.
