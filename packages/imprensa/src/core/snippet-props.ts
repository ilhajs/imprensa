/**
 * Safe transport for `data-ilha-props` in serialized HTML (apostrophes, entities).
 * Ilha emits single-quoted JSON; prerender tests may use double-quoted base64 payloads.
 */

const B64_PREFIX = "b64:";

function encodeBase64Utf8(value: string): string {
  const buf = globalThis.Buffer;
  if (buf) return buf.from(value, "utf8").toString("base64url");
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Utf8(encoded: string): string {
  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const buf = globalThis.Buffer;
  if (buf) return buf.from(normalized + pad, "base64").toString("utf8");
  const binary = atob(normalized + pad);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Encode snippet/island props for a double-quoted HTML attribute (no escape issues). */
export function encodeIlhaProps(props: { code: string; lang: string }): string {
  return B64_PREFIX + encodeBase64Utf8(JSON.stringify(props));
}

export function parseIlhaPropsPayload(raw: string): { code: string; lang: string } | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith(B64_PREFIX)) {
    try {
      const json = decodeBase64Utf8(trimmed.slice(B64_PREFIX.length));
      return normalizeSnippetProps(JSON.parse(json));
    } catch {
      return undefined;
    }
  }

  try {
    return normalizeSnippetProps(JSON.parse(trimmed));
  } catch {
    return undefined;
  }
}

function normalizeSnippetProps(value: unknown): { code: string; lang: string } | undefined {
  if (!value || typeof value !== "object") return undefined;
  const props = value as { code?: unknown; lang?: unknown };
  if (typeof props.code === "string" && typeof props.lang === "string") {
    return { code: props.code, lang: props.lang };
  }
  return undefined;
}

/** Read `data-ilha-props` from a serialized opening tag fragment or full attribute value. */
export function readIlhaPropsFromHtmlFragment(fragment: string): string | undefined {
  const dbl = fragment.match(/data-ilha-props="([^"]*)"/);
  if (dbl) return dbl[1];
  const sgl = fragment.match(/data-ilha-props='([^']*)'/);
  if (sgl) return sgl[1];
  return undefined;
}
