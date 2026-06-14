/** @jsxImportSource ilha */
import ilha from "ilha";
import { shiki, shikiThemes } from "luzpress";
import { preview as previewConfig } from "luzpress/config";
import type { LuzpressShikiHighlighter } from "../core/shiki-types";

const DEFAULT_IMPORTMAP = { imports: {} as Record<string, string> };

const DEFAULT_HEAD = ``;

function makeIframeDoc(code: string) {
  const script = code
    .replace(/^export default /m, "const __island = ")
    .replace(/^export const (\w+)/m, "const $1");

  const importmap = previewConfig.importmap
    ? { imports: { ...DEFAULT_IMPORTMAP.imports, ...JSON.parse(previewConfig.importmap).imports } }
    : DEFAULT_IMPORTMAP;

  const head = previewConfig.head ?? DEFAULT_HEAD;

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

export const Preview = ilha
  .input<{ code64: string }>()
  .onMount(({ host, input }) => {
    const code = atob(input.code64);
    const wrapper = host.querySelector<HTMLElement>(".preview-wrapper")!;

    const pre = document.createElement("pre");
    pre.className =
      "rounded-lg bg-areia-surface-muted border border-areia-border p-4 overflow-x-auto text-sm";
    pre.innerHTML = `<code>${code.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</code>`;
    wrapper.appendChild(pre);

    const iframe = document.createElement("iframe");
    iframe.className = "rounded-lg border border-areia-border w-full min-h-32";
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
    iframe.srcdoc = makeIframeDoc(code);
    wrapper.appendChild(iframe);

    iframe.addEventListener("load", () => {
      const syncDark = () => {
        const dark = document.documentElement.classList.contains("dark");
        iframe.contentDocument?.documentElement.classList.toggle("dark", dark);
      };
      syncDark();
      new MutationObserver(syncDark).observe(document.documentElement, {
        attributeFilter: ["class"],
      });
    });

    shiki.then(async (highlighter) => {
      const previewHighlighter = highlighter as LuzpressShikiHighlighter;
      await previewHighlighter.loadLanguage("tsx");
      const div = document.createElement("div");
      div.className =
        "rounded-lg overflow-hidden border border-areia-border text-sm [&_pre]:!p-4 [&_pre]:!m-0 [&_pre]:overflow-x-auto";
      div.innerHTML = previewHighlighter.codeToHtml(code, {
        lang: "tsx",
        themes: shikiThemes,
      });
      wrapper.replaceChild(div, pre);
    });
  })
  .render(() => <div class="not-prose flex flex-col gap-4 preview-wrapper" />);
