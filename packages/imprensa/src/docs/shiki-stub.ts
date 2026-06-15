/**
 * Published stub for `imprensa/shiki`. The Imprensa Vite plugin replaces this at dev/build
 * with a fine-grained Shiki bundle from `imprensa({ shiki: { langs, themes } })`.
 */
export const shiki = {
  loadLanguage: async (_lang: string) => {},
  codeToHtml: (_code: string, _opts: { lang: string; themes: { light: string; dark: string } }) =>
    "",
};
