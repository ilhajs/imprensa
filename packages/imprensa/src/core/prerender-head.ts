import type { ResolvableHead as Head } from "unhead/types";

/** Flat meta/link entries for vite-prerender-plugin head.elements (not full Unhead resolvables). */
export type PrerenderHeadTagProps = Record<string, string>;

function flattenTagProps(entry: object): PrerenderHeadTagProps {
  const props: PrerenderHeadTagProps = {};
  for (const [key, val] of Object.entries(entry)) {
    if (typeof val === "string") props[key] = val;
    else if (typeof val === "number" || typeof val === "boolean") props[key] = String(val);
  }
  return props;
}

function isPlainTag(entry: object): boolean {
  return !("call" in entry);
}

export function headMetaEntries(head: Head): PrerenderHeadTagProps[] {
  if (!Array.isArray(head.meta)) return [];
  return head.meta.flatMap((entry) =>
    typeof entry === "object" && entry !== null && isPlainTag(entry)
      ? [flattenTagProps(entry)]
      : [],
  );
}

export function headLinkEntries(head: Head): PrerenderHeadTagProps[] {
  if (!Array.isArray(head.link)) return [];
  return head.link.flatMap((entry) =>
    typeof entry === "object" && entry !== null && isPlainTag(entry)
      ? [flattenTagProps(entry)]
      : [],
  );
}

function metaKey(entry: unknown): string | undefined {
  if (typeof entry !== "object" || entry === null) return undefined;
  const tag = entry as { name?: unknown; property?: unknown; "http-equiv"?: unknown };
  const key = tag.name ?? tag.property ?? tag["http-equiv"];
  return typeof key === "string" ? key : undefined;
}

/**
 * Merge page head over defaults. Scalar keys are overridden by the page, but
 * `meta`/`link` arrays are combined — a page defining one meta tag no longer
 * wipes every default meta. Page meta wins over a default with the same
 * name/property; links are concatenated with exact duplicates dropped.
 */
export function mergeHead(defaults: Head | null | undefined, page: Head | null | undefined): Head {
  const merged: Head = { ...defaults, ...page };

  const defaultMeta = Array.isArray(defaults?.meta) ? defaults.meta : [];
  const pageMeta = Array.isArray(page?.meta) ? page.meta : [];
  if (defaultMeta.length > 0 || pageMeta.length > 0) {
    const pageKeys = new Set(pageMeta.map(metaKey).filter((key) => key !== undefined));
    merged.meta = [
      ...defaultMeta.filter((entry) => {
        const key = metaKey(entry);
        return key === undefined || !pageKeys.has(key);
      }),
      ...pageMeta,
    ];
  }

  const defaultLink = Array.isArray(defaults?.link) ? defaults.link : [];
  const pageLink = Array.isArray(page?.link) ? page.link : [];
  if (defaultLink.length > 0 || pageLink.length > 0) {
    const seen = new Set(pageLink.map((entry) => JSON.stringify(entry)));
    merged.link = [...defaultLink.filter((entry) => !seen.has(JSON.stringify(entry))), ...pageLink];
  }

  return merged;
}

export function appendCanonicalTags(
  links: PrerenderHeadTagProps[],
  meta: PrerenderHeadTagProps[],
  canonicalUrl: string,
): { links: PrerenderHeadTagProps[]; meta: PrerenderHeadTagProps[] } {
  return {
    links: [
      ...links.filter((link) => link.rel !== "canonical"),
      { rel: "canonical", href: canonicalUrl },
    ],
    meta: [
      ...meta.filter((item) => item.property !== "og:url" && item.name !== "twitter:url"),
      { property: "og:url", content: canonicalUrl },
      { name: "twitter:url", content: canonicalUrl },
    ],
  };
}
