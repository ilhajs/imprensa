# Luz

Luz is a documentation site toolkit for [Ilha](https://ilha.build). It ships as a Vite meta plugin (**luzpress**) plus a starter template you can scaffold and customize.

## Packages

| Path                | Description                                                            |
| ------------------- | ---------------------------------------------------------------------- |
| `packages/luzpress` | Vite meta plugin — MDX, Shiki, Ilha pages, Tailwind, prerender, search |
| `templates/starter` | Example docs site — landing page, sidebar layout, sample MDX           |

## Quick start

From the monorepo:

```bash
bun install
cd templates/starter
bun run dev
```

Scaffold a new project:

```bash
npx giget@latest gh:ilhajs/luz/templates/starter my-docs
cd my-docs
npm install
npm run dev
```

## luzpress

Add one plugin to `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import { luzpress } from "luzpress";

export default defineConfig({
  plugins: [
    luzpress({
      shiki: {
        themes: { light: "night-owl-light", dark: "houston" },
        langs: ["ts", "mdx", "shell"],
      },
    }),
  ],
});
```

`main.ts` stays minimal:

```ts
import "./app.css";
import { createLuzpress } from "luzpress";

const luzpress = createLuzpress();
luzpress.init();

export const prerender = luzpress.prerender;
```

### Plugin options

| Option           | Default                   | Description                                                             |
| ---------------- | ------------------------- | ----------------------------------------------------------------------- |
| `shiki`          | night-owl-light / houston | Syntax highlighting themes, langs, twoslash                             |
| `contentDir`     | `src/pages/(content)`     | MDX directory for docs routes, sidebar, and search                      |
| `detectDeadLink` | `true`                    | Fail build on broken internal links and heading issues                  |
| `llms`           | `true`                    | Copy MD/MDX sources to `dist` and generate `llms.txt` / `llms-full.txt` |
| `repo`           | —                         | GitHub repo URL for doc toolbar source links                            |
| `repoBranch`     | `main`                    | Git branch for GitHub links                                             |
| `repoPath`       | —                         | Path prefix inside the repo to the project root                         |
| `mdx`            | —                         | Options forwarded to `@mdx-js/rollup`                                   |
| `pages`          | `{ mode: "mpa" }`         | Options forwarded to `@ilha/router/vite`                                |

Import global styles in your app CSS:

```css
@import "luzpress/default.css";
```

Shared UI (search, theme toggle, logo) is available from `luzpress/components`. MDX helpers live in `luzpress/mdx`. Content pages can use `DocArticle` from `luzpress/doc` to render a toolbar with **Copy Markdown** and links to GitHub, raw markdown, ChatGPT, and Claude.

On build, luzpress also copies each doc's source next to its prerendered HTML as `.md` (e.g. `dist/getting-started/index.md`) and writes:

- `dist/llms.txt` — outline with links to source files
- `dist/llms-full.txt` — concatenated raw doc content

## Monorepo scripts

```bash
bun run build    # build all packages
bun run lint     # oxlint
bun run fmt      # oxfmt
```

## Publishing

1. Build and publish `luzpress` to npm
2. Starter template depends on `luzpress` via semver (`^0.1.0`)

See `templates/starter/README.md` for template-specific customization.
