/**
 * Final HTML boundary pass before `raw()` / prerender shell.
 * MDX is executable code; this strips obvious executable markup from rendered HTML.
 */
export function sanitizeMdxHtmlString(html: string): string {
  if (!html) return html;

  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<script\b[^>]*\/>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^\s>]+)/gi, "")
    .replace(/\b(href|src|srcdoc)\s*=\s*("javascript:[^"]*"|'javascript:[^']*')/gi, "")
    .replace(/<script/gi, "&lt;script")
    .replace(/<\/script>/gi, "&lt;/script&gt;");
}
