# imprensa architecture

## Layer boundaries

| Layer      | Path               | May import                                                                 |
| ---------- | ------------------ | -------------------------------------------------------------------------- |
| Core       | `src/core/`        | Node, Ilha router types, Shiki — not `src/docs` or `src/components`        |
| Docs       | `src/docs/`        | `src/core/`, Vite/MDX/unified                                              |
| Components | `src/components/`  | Ilha, Areia, virtual `imprensa/config`, `imprensa/mdx`, `imprensa/runtime` |
| Plugin     | `src/docs/plugin/` | Orchestrates Vite plugins and virtual module resolution                    |

## Public API

All published subpaths resolve to **`dist/`** (see `package.json` `exports` and `tsdown.config.ts` `entry`).

Runtime virtual modules (`imprensa/mdx`, `imprensa/config`, `imprensa/shiki`, `imprensa/landing-shiki`) are generated or transformed by the `imprensa:config` Vite plugin in dev/build; stubs exist under `src/docs/` for types and npm resolution.

## MDX config injection

`src/docs/mdx/runtime-config.ts` contains `MDX_CONFIG_MARKER` (see `mdx-config.ts`). The plugin replaces that block with build-time values (`contentDir`, repo metadata, raw sources, `headDefaults`).

## Large modules (split layout)

- **Rehype:** `src/docs/rehype/` — route graph, heading utils, dead links, preview
- **MDX:** `src/docs/mdx/` — types, document text, routes/index, render, source links, runtime config
- **Vite:** `src/docs/plugin/` — `create-plugins.ts`, landing Shiki, virtual runtime barrel
