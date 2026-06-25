/**
 * Neutralize raw `<` in Twoslash/Shiki code fences (demo XSS strings in source + hover types).
 * HAST only — never regex-rewrite serialized HTML.
 */

type HastElement = {
  type: "element";
  tagName: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

type HastText = { type: "text"; value: string };

type HastNode = HastElement | HastText | { type: string; children?: HastNode[] };

const POPUP_CLASS_PREFIX = "twoslash-popup";

function classList(properties: Record<string, unknown> | undefined): string[] {
  // @shikijs/twoslash sets `properties.class`; rehype/hast-util-* often use `className`.
  const raw = properties?.className ?? properties?.class;
  if (Array.isArray(raw)) return raw.filter((c): c is string => typeof c === "string");
  if (typeof raw === "string") return raw.split(/\s+/).filter(Boolean);
  return [];
}

function hasClass(properties: Record<string, unknown> | undefined, needle: string): boolean {
  return classList(properties).some((c) => c === needle || c.includes(needle));
}

function isTwoslashPre(el: HastElement): boolean {
  return el.tagName === "pre" && hasClass(el.properties, "twoslash");
}

function isTwoslashPopupElement(node: HastNode): node is HastElement {
  return (
    node.type === "element" &&
    classList((node as HastElement).properties).some((c) => c.startsWith(POPUP_CLASS_PREFIX))
  );
}

function escapeRawLessThan(value: string): string {
  return value.replace(/</g, "&lt;");
}

function sanitizeTextNodesDeep(children: HastNode[] | undefined): void {
  if (!children) return;
  for (const child of children) {
    if (child.type === "text") {
      (child as HastText).value = escapeRawLessThan((child as HastText).value);
      continue;
    }
    if (child.type === "element") sanitizeTextNodesDeep((child as HastElement).children);
  }
}

/**
 * `@shikijs/twoslash` wraps each hover popup in `<code class="twoslash-popup-code">`,
 * which can contain a full block-level `<pre class="shiki">`. `<code>` is an HTML
 * *formatting element*, so when popups nest deeply the parser's adoption-agency
 * algorithm clones the still-open `<code>` onto later siblings — leaking
 * `<code class="twoslash-popup-code">` tags past `</article>` and swallowing the
 * page tail into a hidden popup (the page looks "cut"). Retagging to `<div>`
 * (non-formatting, legal `<pre>` parent) removes the cause; styling is class-based.
 */
function retagPopupCode(el: HastElement): void {
  if (el.tagName === "code" && hasClass(el.properties, "twoslash-popup-code")) {
    el.tagName = "div";
  }
}

function sanitizePopupSubtree(children: HastNode[] | undefined): void {
  if (!children) return;
  for (const child of children) {
    if (child.type === "text") {
      (child as HastText).value = escapeRawLessThan((child as HastText).value);
      continue;
    }
    if (child.type === "element") {
      retagPopupCode(child as HastElement);
      sanitizePopupSubtree((child as HastElement).children);
    }
  }
}

/** Retag popup wrappers inside a twoslash fence without re-walking the whole document. */
function retagPopupCodesInsideTwoslashPre(children: HastNode[] | undefined): void {
  if (!children) return;
  for (const child of children) {
    if (child.type !== "element") continue;
    const el = child as HastElement;
    retagPopupCode(el);
    retagPopupCodesInsideTwoslashPre(el.children);
  }
}

function walk(node: HastNode): void {
  if (node.type === "element") {
    const el = node as HastElement;
    if (isTwoslashPre(el)) {
      sanitizeTextNodesDeep(el.children);
      retagPopupCodesInsideTwoslashPre(el.children);
      return;
    }
    if (isTwoslashPopupElement(el)) {
      retagPopupCode(el);
      sanitizePopupSubtree(el.children);
      return;
    }
    if (Array.isArray(el.children)) {
      for (const child of el.children) walk(child);
    }
    return;
  }
  if (Array.isArray((node as { children?: HastNode[] }).children)) {
    for (const child of (node as { children: HastNode[] }).children) walk(child);
  }
}

/** Rehype plugin — run after `@shikijs/twoslash`. */
export function rehypeSanitizeTwoslash() {
  return (tree: HastNode) => {
    walk(tree);
    return tree;
  };
}

/** Escape `<` in twoslash type/hover strings before Shiki re-highlights them. */
export function escapeTwoslashHoverTypeText(text: string): string {
  return text.replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}
