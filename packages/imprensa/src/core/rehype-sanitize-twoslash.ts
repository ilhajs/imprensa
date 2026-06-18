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
  const raw = properties?.className;
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

function sanitizePopupSubtree(children: HastNode[] | undefined): void {
  sanitizeTextNodesDeep(children);
}

function walk(node: HastNode): void {
  if (node.type === "element") {
    const el = node as HastElement;
    if (isTwoslashPre(el)) {
      sanitizeTextNodesDeep(el.children);
      return;
    }
    if (isTwoslashPopupElement(el)) {
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
