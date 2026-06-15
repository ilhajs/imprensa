# Imprensa

Imprensa is a documentation site toolkit for [Ilha](https://ilha.build). It ships as a Vite meta plugin (**imprensa**) plus a starter template you can scaffold and customize.

## Packages

| Path                | Description                                                            |
| ------------------- | ---------------------------------------------------------------------- |
| `packages/imprensa` | Vite meta plugin — MDX, Shiki, Ilha pages, Tailwind, prerender, search |
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
npx giget@latest gh:ilhajs/imprensa/templates/starter my-docs
cd my-docs
npm install
npm run dev
```

## imprensa

Add one plugin to `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import { imprensa } from "imprensa";

export default defineConfig({
  plugins: [
    imprensa({
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
import { createImprensa } from "imprensa";

const imprensa = createImprensa();
imprensa.init();

export const prerender = imprensa.prerender;
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
@import "imprensa/default.css";
```

Shared UI (search, theme toggle, logo) is available from `imprensa/components`. MDX helpers live in `imprensa/mdx`. Content pages can use `DocArticle` from `imprensa/doc` to render a toolbar with **Copy Markdown** and links to GitHub, raw markdown, ChatGPT, and Claude.

On build, imprensa also copies each doc's source next to its prerendered HTML as `.md` (e.g. `dist/getting-started/index.md`) and writes:

- `dist/llms.txt` — outline with links to source files
- `dist/llms-full.txt` — concatenated raw doc content

## Monorepo scripts

```bash
bun run build    # build all packages
bun run lint     # oxlint
bun run fmt      # oxfmt
```

## Publishing

1. Build and publish `imprensa` to npm
2. Starter template depends on `imprensa` via semver (`^0.1.0`)

See `templates/starter/README.md` for template-specific customization.
