import { mdxIslandLoaders } from "imprensa/mdx-islands";
import { filePathToRoutePath } from "../core/route-path";

/**
 * Components invoked in MDX render to static markup during prerender, where
 * self-scheduled client wiring (e.g. areia's `schedule*AutoBind`) never runs —
 * there is no `document`. On the client we re-invoke each non-island component
 * the current page's MDX imports once, discarding the output; the call's side
 * effect schedules the document-wide bind for every prerendered instance.
 * Islands are excluded: they mount through the tagged-slot mechanism instead.
 */

type MaybeIsland = { mount?: unknown };

function isIsland(value: unknown): value is MaybeIsland {
  return (
    !!value &&
    (typeof value === "object" || typeof value === "function") &&
    typeof (value as MaybeIsland).mount === "function"
  );
}

const loadedComponents = new Map<string, unknown>();

async function loadComponent(key: string, loader: () => Promise<unknown>) {
  if (loadedComponents.has(key)) return loadedComponents.get(key);
  try {
    const loaded = await loader();
    loadedComponents.set(key, loaded);
    return loaded;
  } catch (err) {
    console.error(`[imprensa] failed to load MDX component ${key}:`, err);
    loadedComponents.set(key, undefined);
    return undefined;
  }
}

/**
 * Re-run on content swaps: autobind schedulers dedupe per microtask and track
 * already-bound roots, so repeat invocations only bind new DOM instances.
 */
export async function autobindMdxComponentsForRoute(path: string) {
  if (typeof document === "undefined") return;

  const normalizedPath = path.replace(/\/$/, "") || "/";
  const spec = Object.keys(mdxIslandLoaders).find(
    (filePath) => filePathToRoutePath(filePath) === normalizedPath,
  );
  if (!spec) return;

  for (const [key, loader] of Object.entries(mdxIslandLoaders[spec])) {
    const component = await loadComponent(key, loader);
    if (typeof component !== "function" || isIsland(component)) continue;
    try {
      component({});
    } catch (err) {
      console.error(`[imprensa] MDX component auto-bind failed (${key}):`, err);
    }
  }
}
