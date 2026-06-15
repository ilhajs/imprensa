# imprensa

Vite meta-plugin and runtime for **Ilha** + **Areia** documentation sites (MDX, Shiki, static prerender, docs chrome).

## Install

```bash
bun add imprensa areia ilha @ilha/store @ilha/router lucide
```

Peer versions are listed in `package.json` — align `ilha`, `areia`, and `@ilha/store` with the starter template.

## Use

```ts
// vite.config.ts
import { imprensa } from "imprensa";

export default defineConfig({
  plugins: [imprensa({ contentDir: "src/content", hostname: "https://example.com" })],
});
```

```ts
// src/main.ts
import { createImprensa } from "imprensa/runtime";

void createImprensa().init();
```

See `templates/starter` in the [imprensa](https://github.com/ilhajs/imprensa) monorepo.

## Exports

| Subpath                | Role                                     |
| ---------------------- | ---------------------------------------- |
| `imprensa`             | Vite plugin                              |
| `imprensa/runtime`     | `createImprensa`, theme, mount/hydrate   |
| `imprensa/prerender`   | Static prerender entry                   |
| `imprensa/mdx`         | Routes, search index, MDX render helpers |
| `imprensa/components`  | Layout, sidebar, search triggers         |
| `imprensa/doc`         | Doc toolbar, pager                       |
| `imprensa/default.css` | Docs theme + Tailwind layers             |

## Global search

Search mounts on `document.body` from `createImprensa().init()`. State lives in `@ilha/store` (`searchOpen`, `searchQuery`). Triggers use `data-search-trigger` or ⌘K.

## Alpha

`0.1.x` is an **alpha** API — expect small breaking changes. Pin exact versions in production until `1.0`.
