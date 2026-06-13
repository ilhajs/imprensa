/** Browser Shiki instance from `luzpress/shiki` virtual module. */
export type LuzpressShikiHighlighter = {
  loadLanguage: (lang: string) => Promise<void>;
  codeToHtml: (
    code: string,
    options: { lang: string; themes: { light: string; dark: string } },
  ) => string;
};
