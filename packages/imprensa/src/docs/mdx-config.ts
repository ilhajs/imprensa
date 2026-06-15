export const MDX_CONFIG_MARKER = `declare const __IMPRENSA_CONTENT_DIR__: string;
declare const __IMPRENSA_REPO__: string;
declare const __IMPRENSA_REPO_BRANCH__: string;
declare const __IMPRENSA_REPO_PATH__: string;
declare const __IMPRENSA_RAW_SOURCES__: Record<string, string>;
declare const __IMPRENSA_HEAD_DEFAULTS__: Head | null;

export const contentDir = __IMPRENSA_CONTENT_DIR__;
export const imprensaRepo = __IMPRENSA_REPO__;
export const imprensaRepoBranch = __IMPRENSA_REPO_BRANCH__;
export const imprensaRepoPath = __IMPRENSA_REPO_PATH__;
export const mdxRawSources: Record<string, string> = __IMPRENSA_RAW_SOURCES__;
export const headDefaults: Head | null = __IMPRENSA_HEAD_DEFAULTS__;`;
