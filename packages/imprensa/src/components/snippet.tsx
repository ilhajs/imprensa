import ilha from "ilha";
import { shikiThemes } from "imprensa/config";

type ImprensaShikiHighlighter = {
  loadLanguage: (lang: string) => Promise<void>;
  codeToHtml: (
    code: string,
    options: { lang: string; themes: { light: string; dark: string } },
  ) => string;
};

const WRAPPER_CLASS =
  "max-w-full overflow-x-auto rounded-xl border border-areia-border text-xs leading-relaxed [&_pre]:min-w-max [&_pre]:p-4 [&_pre]:text-xs [&_pre]:leading-relaxed [&_pre]:!m-0";

function escapeHtml(code: string) {
  return code.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

export const Snippet = ilha
  .input<{ code: string; lang: string }>()
  .onMount(({ host, input }) => {
    const mount = host.querySelector<HTMLElement>("[data-imprensa-snippet]")!;
    if (mount.querySelector(".shiki")) return;

    const { code, lang } = input;
    mount.replaceChildren();

    const pre = document.createElement("pre");
    pre.className =
      "rounded-lg bg-areia-surface-muted border border-areia-border p-4 overflow-x-auto text-xs leading-relaxed";
    pre.innerHTML = `<code>${escapeHtml(code)}</code>`;
    mount.appendChild(pre);

    void import("imprensa/shiki").then(async ({ shiki }) => {
      const h = shiki as ImprensaShikiHighlighter;
      await h.loadLanguage(lang);
      const div = document.createElement("div");
      div.innerHTML = h.codeToHtml(code, { lang, themes: shikiThemes });
      const highlighted = div.firstElementChild;
      if (!highlighted) return;
      mount.replaceChildren(highlighted);
    });
  })
  .render(() => <div class={WRAPPER_CLASS} data-imprensa-snippet />);
