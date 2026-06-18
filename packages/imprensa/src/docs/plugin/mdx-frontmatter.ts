import type { Plugin } from "vite";

/** Remove YAML frontmatter so @mdx-js/rollup never sees `---` + ESM imports + headings. */
export function stripLeadingFrontmatter(code: string): string {
  if (!code.startsWith("---")) return code;
  const end = code.indexOf("\n---", 3);
  if (end === -1) return code;
  return code.slice(end + 4).replace(/^\r?\n/, "");
}

export function viteMdxStripFrontmatter(): Plugin {
  return {
    name: "imprensa:mdx-strip-frontmatter",
    enforce: "pre",
    transform(code, id) {
      const path = id.split("?")[0] ?? id;
      if (!path.endsWith(".mdx")) return;

      const body = stripLeadingFrontmatter(code);
      if (body === code) return;
      return { code: body, map: null };
    },
  };
}
