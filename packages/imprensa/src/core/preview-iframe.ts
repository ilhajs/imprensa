/** Preview sandbox document for fenced ```tsx preview blocks (shared SSR + client). */

export type PreviewSandboxConfig = {
  importmap?: string;
  head?: string;
};

const DEFAULT_IMPORTMAP = { imports: {} as Record<string, string> };

export function makePreviewIframeDoc(code: string, config: PreviewSandboxConfig = {}) {
  const script = code
    .replace(/^export default /m, "const __island = ")
    .replace(/^export const (\w+)/m, "const $1");

  const importmap = config.importmap
    ? { imports: { ...DEFAULT_IMPORTMAP.imports, ...JSON.parse(config.importmap).imports } }
    : DEFAULT_IMPORTMAP;

  const head = config.head ?? "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script>const localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };</script>
  <script type="importmap">${JSON.stringify(importmap)}</script>
  <script type="module" src="https://esm.sh/tsx"></script>
  ${head}
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-type="module">
    ${script}
    const __resolved = typeof __island !== 'undefined' ? __island : typeof App !== 'undefined' ? App : undefined;
    if (__resolved?.mount) __resolved.mount(document.getElementById('root'));
  </script>
</body>
</html>`;
}

export function decodePreviewCode64(code64: string) {
  if (typeof atob === "function") return atob(code64);
  const bufferCtor = (
    globalThis as {
      Buffer?: {
        from: (value: string, encoding: "base64") => { toString: (encoding: "utf8") => string };
      };
    }
  ).Buffer;
  if (bufferCtor) return bufferCtor.from(code64, "base64").toString("utf8");
  throw new Error("preview: cannot decode base64");
}
