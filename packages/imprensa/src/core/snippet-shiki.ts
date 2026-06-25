import type { ImprensaShikiOptions } from "./shiki";
import { normalizeShikiLangId, resolveShikiLangs, resolveShikiThemeIds } from "./shiki-client";

const WRAPPER_CLASS =
  "max-w-full overflow-x-auto rounded-xl border border-areia-border text-xs leading-relaxed [&_pre]:min-w-max [&_pre]:p-4 [&_pre]:text-xs [&_pre]:leading-relaxed [&_pre]:!m-0";

function themePair(shiki: ImprensaShikiOptions | undefined) {
  if (shiki === false || !shiki?.themes) {
    return { light: "night-owl-light", dark: "houston" };
  }
  return shiki.themes;
}

async function getHighlighter(shiki: ImprensaShikiOptions | undefined) {
  const { createConfiguredHighlighterCore } = await import("./shiki-build");
  const themeIds = resolveShikiThemeIds(shiki);
  const langIds = resolveShikiLangs(shiki);
  return createConfiguredHighlighterCore(themeIds, langIds);
}

export async function codeToSnippetHtml(
  code: string,
  lang: string,
  shiki: ImprensaShikiOptions | undefined,
) {
  const allowed = resolveShikiLangs(shiki);
  if (!allowed.includes(normalizeShikiLangId(lang))) {
    throw new Error(
      `imprensa: <Snippet> uses language "${lang}" which is not registered. ` +
        `Add it under imprensa({ shiki: { langs: [..., ${JSON.stringify(lang)}] } }) in vite.config.`,
    );
  }
  const h = await getHighlighter(shiki);
  const themes = themePair(shiki);
  const inner = h.codeToHtml(code, { lang, themes });
  return `<div class="${WRAPPER_CLASS}" data-imprensa-snippet>${inner}</div>`;
}

const SNIPPET_SLOT_RE =
  /(<div data-ilha-slot="[^"]*" data-ilha-props='[^']*'>)(<div class="[^"]*" data-imprensa-snippet>[\s\S]*?<\/div>)(<\/div>)/g;

/**
 * Paint Snippet islands in prerendered HTML (same Shiki themes as MDX).
 * Rebuilds the string from match offsets in a single pass so identical snippets
 * paint independently and `$`-sequences in highlighted output are never re-interpreted.
 */
export async function paintSnippetSlotsInHtml(
  html: string,
  shiki: ImprensaShikiOptions | undefined,
) {
  if (shiki === false) return html;

  const matches = [...html.matchAll(SNIPPET_SLOT_RE)];
  if (matches.length === 0) return html;

  const segments: string[] = [];
  let cursor = 0;
  for (const match of matches) {
    const start = match.index ?? 0;
    const propsMatch = match[1].match(/data-ilha-props='([^']*)'/);
    const props = propsMatch ? safeParseProps(propsMatch[1]!) : undefined;
    if (!props) continue;

    const painted = await codeToSnippetHtml(props.code, props.lang, shiki);
    segments.push(html.slice(cursor, start), match[1], painted, match[3]);
    cursor = start + match[0].length;
  }
  segments.push(html.slice(cursor));
  return segments.join("");
}

function safeParseProps(raw: string): { code: string; lang: string } | undefined {
  try {
    const props = JSON.parse(raw) as { code?: unknown; lang?: unknown };
    if (typeof props.code === "string" && typeof props.lang === "string") {
      return { code: props.code, lang: props.lang };
    }
  } catch {
    // keep slot unpainted
  }
  return undefined;
}
