/** Client-safe MDX island registry (no content-tree / fs). Injected at build by imprensa Vite plugin. */

type MdxIslandModule = { mount?: unknown; default?: { mount?: unknown }; [key: string]: unknown };

declare const __IMPRENSA_MDX_ISLANDS__: Record<
  string,
  Record<string, () => Promise<MdxIslandModule>>
>;
declare const __IMPRENSA_MDX_ISLAND_SEQUENCES__: Record<string, string[]>;

export const mdxIslandLoaders = __IMPRENSA_MDX_ISLANDS__;
export const mdxIslandSequences = __IMPRENSA_MDX_ISLAND_SEQUENCES__;
