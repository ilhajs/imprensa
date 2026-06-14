import type { LuzpressShikiOptions } from "./shiki";
import { resolveShikiLangs, resolveShikiThemeIds } from "./shiki-client-langs";

const WRAPPER_CLASS =
  "max-w-full overflow-x-auto rounded-xl border border-areia-border text-xs leading-relaxed [&_pre]:min-w-max [&_pre]:p-4 [&_pre]:text-xs [&_pre]:leading-relaxed [&_pre]:!m-0";

function themePair(shiki: LuzpressShikiOptions | undefined) {
  if (shiki === false || !shiki?.themes) {
    return { light: "night-owl-light", dark: "houston" };
  }
  return shiki.themes;
}

async function getHighlighter(shiki: LuzpressShikiOptions | undefined) {
  const { createConfiguredHighlighterCore } = await import("./shiki-build");
  const themeIds = resolveShikiThemeIds(shiki);
  const langIds = resolveShikiLangs(shiki);
  return createConfiguredHighlighterCore(themeIds, langIds);
}

export async function codeToSnippetHtml(
  code: string,
  lang: string,
  shiki: LuzpressShikiOptions | undefined,
) {
  const h = await getHighlighter(shiki);
  const themes = themePair(shiki);
  const inner = h.codeToHtml(code, { lang, themes });
  return `<div class="${WRAPPER_CLASS}" data-luz-snippet>${inner}</div>`;
}

const SNIPPET_SLOT_RE =
  /(<div data-ilha-slot="[^"]*" data-ilha-props='[^']*'>)(<div class="[^"]*" data-luz-snippet>[\s\S]*?<\/div>)(<\/div>)/g;

/** Paint Snippet islands in prerendered HTML (same Shiki themes as MDX). */
export async function paintSnippetSlotsInHtml(
  html: string,
  shiki: LuzpressShikiOptions | undefined,
) {
  if (shiki === false) return html;

  let out = html;
  const matches = [...html.matchAll(SNIPPET_SLOT_RE)];
  for (const match of matches) {
    const propsMatch = match[1].match(/data-ilha-props='([^']*)'/);
    if (!propsMatch) continue;
    try {
      const props = JSON.parse(propsMatch[1]!) as { code?: string; lang?: string };
      if (typeof props.code !== "string" || typeof props.lang !== "string") continue;
      const painted = await codeToSnippetHtml(props.code, props.lang, shiki);
      out = out.replace(match[0], `${match[1]}${painted}${match[3]}`);
    } catch {
      // keep slot
    }
  }
  return out;
}
