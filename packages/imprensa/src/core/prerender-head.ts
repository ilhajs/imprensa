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
