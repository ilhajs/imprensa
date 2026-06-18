import { mdxIslandLoaders } from "imprensa/mdx-islands";
import { MultiCopy } from "./multi-copy";
import { Snippet } from "./snippet";

type IslandMountable = {
  mount: (host: Element, props?: Record<string, unknown>) => (() => void) | void | Promise<unknown>;
};

const builtinMdxIslands: Record<string, IslandMountable> = {
  "imprensa:MultiCopy": MultiCopy,
  "imprensa:Snippet": Snippet,
};

const mountedHosts = new Map<Element, () => void>();
const islandCache = new Map<string, IslandMountable | undefined>();

function cleanupDisconnectedHosts() {
  for (const [host, unmount] of mountedHosts) {
    if (host.isConnected) continue;
    mountedHosts.delete(host);
    try {
      unmount();
    } catch (err) {
      console.error("[imprensa] MDX island cleanup failed:", err);
    }
  }
}

function parseProps(el: Element): Record<string, unknown> | undefined {
  const raw = el.getAttribute("data-ilha-props");
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function isMountable(value: unknown): value is IslandMountable {
  return (
    !!value &&
    (typeof value === "object" || typeof value === "function") &&
    typeof (value as IslandMountable).mount === "function"
  );
}

async function resolveIsland(key: string): Promise<IslandMountable | undefined> {
  if (builtinMdxIslands[key]) return builtinMdxIslands[key];
  if (islandCache.has(key)) return islandCache.get(key);

  for (const loaders of Object.values(mdxIslandLoaders)) {
    const loader = loaders[key];
    if (!loader) continue;
    try {
      const loaded = await loader();
      const island = isMountable(loaded) ? loaded : undefined;
      islandCache.set(key, island);
      return island;
    } catch (err) {
      console.error(`[imprensa] failed to load MDX island ${key}:`, err);
      islandCache.set(key, undefined);
      return undefined;
    }
  }

  islandCache.set(key, undefined);
  return undefined;
}

async function mountOne(key: string, el: Element, props: Record<string, unknown>) {
  if (mountedHosts.has(el)) return;
  const island = await resolveIsland(key);
  if (!island || mountedHosts.has(el) || !el.isConnected) return;

  try {
    const cleanup = island.mount(el, props);
    mountedHosts.set(el, typeof cleanup === "function" ? cleanup : () => {});
  } catch (err) {
    console.error(`[imprensa] MDX island mount failed (${key}):`, err);
  }
}

/** Mount interactive MDX islands injected as HTML (not via page registry). */
export function mountMdxIslandsInRoot(root: ParentNode = document) {
  if (typeof document === "undefined") return;

  cleanupDisconnectedHosts();
  const slots = root.querySelectorAll<HTMLElement>(
    "[data-ilha-slot][data-ilha-props][data-imprensa-mdx-island]",
  );
  for (const el of slots) {
    const key = el.getAttribute("data-imprensa-mdx-island");
    if (!key) continue;
    const props = parseProps(el);
    if (!props) continue;
    void mountOne(key, el, props);
  }
}

/** Dev SPA: mount MDX islands when article content changes. Prod static uses `runDocMdxEnhancements`. */
export function ensureMdxIslandsMounted() {
  if (typeof document === "undefined") return () => {};

  let scheduled = false;
  const run = () => {
    for (const article of document.querySelectorAll("article")) {
      mountMdxIslandsInRoot(article);
    }
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      run();
    });
  };

  run();
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });

  return () => observer.disconnect();
}
