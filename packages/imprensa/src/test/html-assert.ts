/**
 * Regression helpers for serialized doc HTML (twoslash fences, article balance).
 */

export function countMatches(html: string, pattern: RegExp): number {
  return html.match(pattern)?.length ?? 0;
}

/** Naive tag stack balance for pre/code inside a HTML fragment. */
export function unclosedPreCodeDepth(html: string): number {
  const re = /<\/?(pre|code)(?:\s[^>]*)?>/gi;
  const stack: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const close = m[0].startsWith("</");
    const tag = m[1]!.toLowerCase();
    if (!close) stack.push(tag);
    else stack.pop();
  }
  return stack.length;
}

export function assertTwoslashPopupRetag(html: string): void {
  const codePopup = countMatches(html, /<code\b[^>]*class="[^"]*twoslash-popup-code/gi);
  const divPopup = countMatches(html, /<div\b[^>]*class="[^"]*twoslash-popup-code/gi);
  if (codePopup > 0) {
    throw new Error(`expected 0 <code class="twoslash-popup-code">, got ${codePopup}`);
  }
  const nestedPreInPopup = countMatches(html, /twoslash-popup-code"><pre class="shiki/gi);
  const nestedDivInPopup = countMatches(html, /twoslash-popup-code"><div class="shiki/gi);
  if (nestedPreInPopup > 0) {
    throw new Error(
      `expected nested popup shiki as <div>, found ${nestedPreInPopup} <pre class="shiki"> inside popup`,
    );
  }
  if (divPopup === 0 && !html.includes("twoslash")) return;
}

export function assertBalancedPreCode(html: string, context = "fragment"): void {
  const depth = unclosedPreCodeDepth(html);
  if (depth !== 0) {
    throw new Error(`${context}: unclosed pre/code depth ${depth} (expected 0)`);
  }
}
