/**
 * Regression helpers for serialized doc HTML (twoslash fences, article balance).
 */

export function countMatches(html: string, pattern: RegExp): number {
  return html.match(pattern)?.length ?? 0;
}

export type PreCodeBalanceResult = { ok: true } | { ok: false; reason: string };

/** Stack balance with mis-nested pre/code detection. */
export function checkPreCodeBalance(html: string): PreCodeBalanceResult {
  const re = /<\/?(pre|code)(?:\s[^>]*)?>/gi;
  const stack: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const close = m[0].startsWith("</");
    const tag = m[1]!.toLowerCase();
    if (!close) {
      stack.push(tag);
      continue;
    }
    const top = stack.pop();
    if (top !== tag) {
      return {
        ok: false,
        reason: `mis-nested </${tag}> (expected </${top ?? "∅"}>, stack depth ${stack.length})`,
      };
    }
  }
  if (stack.length > 0) {
    return { ok: false, reason: `unclosed <${stack.join(">, <")}>` };
  }
  return { ok: true };
}

/** @deprecated use checkPreCodeBalance — returns net depth only when ok, else positive unclosed count heuristic */
export function unclosedPreCodeDepth(html: string): number {
  const result = checkPreCodeBalance(html);
  return result.ok ? 0 : 1;
}

export function assertTwoslashPopupRetag(html: string): void {
  const codePopup = countMatches(html, /<code\b[^>]*class="[^"]*twoslash-popup-code/gi);
  if (codePopup > 0) {
    throw new Error(`expected 0 <code class="twoslash-popup-code">, got ${codePopup}`);
  }

  const nestedPreInPopup = countMatches(html, /twoslash-popup-code"><pre class="shiki/gi);
  if (nestedPreInPopup > 0) {
    throw new Error(
      `expected nested popup shiki as <div>, found ${nestedPreInPopup} <pre class="shiki"> inside popup`,
    );
  }

  const hasTwoslashFence = /\bclass="[^"]*\btwoslash\b/gi.test(html);
  const hasHover = html.includes("twoslash-hover");
  const divPopup = countMatches(html, /<div\b[^>]*class="[^"]*twoslash-popup-code/gi);

  if (hasTwoslashFence && hasHover && divPopup === 0) {
    throw new Error(
      'twoslash hover markup present but no <div class="twoslash-popup-code"> (retag missing?)',
    );
  }
}

export function assertBalancedPreCode(html: string, context = "fragment"): void {
  const result = checkPreCodeBalance(html);
  if (!result.ok) {
    throw new Error(`${context}: ${result.reason}`);
  }
}
