/** Landing card samples → Shiki HTML via virtual module `luzpress/landing-shiki` (read automatically when this file exists). */

export const landingSnippets = {
  fileTree: {
    lang: "shell",
    code: `src/
  lib/components/
  main.ts
  pages/
    (content)/*.mdx`,
  },
  mdx: {
    lang: "mdx",
    code: `# Writing great docs

\`\`\`ts
const path = "/guide/writing"
\`\`\`

<Button>Try it</Button>`,
  },
  build: {
    lang: "shell",
    code: `$ bun run build
✓ dist/index.html
✓ dist/getting-started/index.html

Deploy dist/ anywhere.`,
  },
} as const;
