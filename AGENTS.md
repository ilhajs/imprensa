# Luz / luzpress — agent notes

Luz is a docs-site toolkit: **luzpress** (Vite meta-plugin) + **templates/starter**. Stack: [Ilha](https://ilha.build), [Areia](https://areia.ilha.build), MDX, Shiki, static prerender.

## Before touching code

Read (or fetch) once per task when using islands, router, or UI primitives:

- https://ilha.build/llms.txt
- https://areia.ilha.build/llms.txt

## Repo layout

| Path                | Role                                                                   |
| ------------------- | ---------------------------------------------------------------------- |
| `packages/luzpress` | Publishable `luzpress` package — **only** production library right now |
| `templates/starter` | Reference consumer; validate changes with `bun run build` here         |

**luzpress `src/` split** (keep boundaries when adding code):

- `src/core/` — runtime (`createLuzpress`, prerender, theme), routes helpers, Shiki build bits
- `src/docs/` — Vite plugin (`luzpress()`), MDX, rehype, llms.txt, options
- `src/components/` — docs UI (layout, sidebar, search, doc toolbar, icons)

Entry: `src/index.ts` re-exports plugin + runtime types. **Do not** grow a second npm package without a real non-docs consumer.

## Commands

```bash
bun install
bun run build                    # all packages (tsdown → packages/luzpress/dist/…)
cd templates/starter && bun run dev
cd templates/starter && bun run build   # gen:hero + vite build + tsc — primary integration check
```

Lint/format: `bun run lint`, `bun run fmt` (root).

## luzpress public surface (do not break casually)

- **Vite:** `import { luzpress } from "luzpress"` → `PluginOption[]`
- **Client:** `import { createLuzpress } from "luzpress/runtime"` (or browser export of `luzpress`) — `init()`, `prerender`
- **App imports:** `luzpress/components`, `luzpress/doc`, `luzpress/mdx`, `luzpress/config`, `luzpress/icons`, `luzpress/default.css`

Built artifacts live under **`dist/`** with subpaths (`dist/core/runtime.mjs`, `dist/docs/mdx.mjs`, …). `package.json` `exports` must stay aligned with `tsdown.config.ts` entries.

## Vite plugin behavior (mental model)

- Wires: `@mdx-js/rollup`, `@ilha/router/vite` **`pages()`** — **`mode: "spa"` in `vite dev`**, **`mode: "static"` on build** (override via `pages.mode` in `luzpress()`), `interceptLinks: false`, Tailwind, `vite-prerender-plugin`, sitemap, optional dead-link rehype.
- **Dev client entry:** `createLuzpress().init()` must use **`pageRouter.mount("#app")`** (SPA), not `hydrateStatic` — static-mode router warns and no-ops on `.mount()`.
- **Prerender entry:** `src/prerender.ts` uses `createPrerender` from **`luzpress/prerender`**, static imports from **`../.ilha/pages.server`** (not `ilha:` — Node cannot load that protocol). Plugin sets `prerenderScript` + `renderTarget: "#app"`. **`main.ts`** only calls `void init()` — no `prerender` export.
- **Virtual / resolved IDs:** `luzpress`, `luzpress/mdx`, `luzpress/config`, `luzpress/shiki`, `luzpress/components`, `luzpress/doc` — paths in `docs/vite-plugin.ts` use **`../src/...` from bundled `dist/index.mjs`**, not relative to `src/docs/` alone.
- **`luzpress/mdx.ts`** contains a literal `MDX_CONFIG_MARKER` block replaced at build time (`contentDir`, repo, raw sources, `headDefaults`). Keep marker and `docs/mdx-config.ts` in sync if you change inject shape.
- Injects **sidebar layout boot** script/style into HTML (`SIDEBAR_LAYOUT_BOOT_SCRIPT` in `components/sidebar-layout.ts`) so saved split applies before paint.

## Starter app conventions

- Pages: `templates/starter/src/pages/` — Ilha file routes; MDX under `(content)/`.
- `src/main.ts`: `createLuzpress({ hostname }).init()` + `export const prerender = …`
- Content layout: `luzpress/components` → `ContentLayout` (resizable sidebar + search).
- Theme flash: inline script in `index.html` for `luz:theme`; sidebar split uses `luzpress:sidebar-layout` + boot CSS vars.

## Gotchas (save time)

1. **Sidebar resizable persistence** (`components/layout.tsx` + `sidebar-layout.ts`): Never drive layout with Ilha **`state.layout` on every `resizable:change`** — Areia `Resizable` reconnects on re-render → feedback loop / freeze. Persist **`localStorage` only** on user resize; restore via boot script + `defaultSize` from `readSidebarLayout()` + optional one-shot `resizable:set` when boot did not run. Ignore initial `resizable:change` until `persist` flag is true (or boot already applied).

2. **Clipped nav rings:** Resizable panels get inline **`overflow: hidden`** from `@areia/slots`. Active sidebar links use **`ring-inset`** (see `sidebar.tsx`), not outer `ring-1` alone.

3. **Areia Resizable:** Imperative sync uses **`resizable:set`** with `{ layout: number[] }` on the `[data-slot="resizable"]` root. Saving overwrites storage if you listen before restore — guard persistence.

4. **Workspace dev:** Starter depends on `luzpress` from the monorepo; after plugin/runtime changes, **`bun run build` in `packages/luzpress`** before expecting starter builds to pick up logic (source components are referenced via plugin resolve, but runtime/dist entries matter for `luzpress/runtime`).

5. **Codegen:** Client/server use `ilha:pages/client` and `ilha:pages/server` (from `@ilha/router`); types in `packages/luzpress/index.d.ts`.

## When adding features

- Docs-only UI → `src/components/` or `src/docs/`.
- Reusable static/MPA mechanics (mount, prerender, routes) → `src/core/` first; extract to a second package only when a second consumer exists.
- Prefer **`ctx_batch_execute` / sandbox** for large repo scans; read Ilha/Areia docs via fetch above before guessing APIs.
