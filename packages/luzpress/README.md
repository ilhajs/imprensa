# luzpress

Vite meta-plugin and runtime for **Ilha** + **Areia** documentation sites (MDX, Shiki, static prerender, docs chrome).

## Install

```bash
bun add luzpress areia ilha @ilha/store @ilha/router lucide
```

Peer versions are listed in `package.json` — align `ilha`, `areia`, and `@ilha/store` with the starter template.

## Use

```ts
// vite.config.ts
import { luzpress } from "luzpress";

export default defineConfig({
  plugins: [luzpress({ contentDir: "src/content", hostname: "https://example.com" })],
});
```

```ts
// src/main.ts
import { createLuzpress } from "luzpress/runtime";

void createLuzpress().init();
```

See `templates/starter` in the [luz](https://github.com/ilhajs/luz) monorepo.

## Exports

| Subpath                | Role                                     |
| ---------------------- | ---------------------------------------- |
| `luzpress`             | Vite plugin                              |
| `luzpress/runtime`     | `createLuzpress`, theme, mount/hydrate   |
| `luzpress/prerender`   | Static prerender entry                   |
| `luzpress/mdx`         | Routes, search index, MDX render helpers |
| `luzpress/components`  | Layout, sidebar, search triggers         |
| `luzpress/doc`         | Doc toolbar, pager                       |
| `luzpress/default.css` | Docs theme + Tailwind layers             |

## Global search

Search mounts on `document.body` from `createLuzpress().init()`. State lives in `@ilha/store` (`searchOpen`, `searchQuery`). Triggers use `data-search-trigger` or ⌘K.

## Alpha

`0.1.x` is an **alpha** API — expect small breaking changes. Pin exact versions in production until `1.0`.
