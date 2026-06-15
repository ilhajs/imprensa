/** Browser Shiki instance from `imprensa/shiki` virtual module. */
export type ImprensaShikiHighlighter = {
  loadLanguage: (lang: string) => Promise<void>;
  codeToHtml: (
    code: string,
    options: { lang: string; themes: { light: string; dark: string } },
  ) => string;
};
