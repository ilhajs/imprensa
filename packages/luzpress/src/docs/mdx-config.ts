export const MDX_CONFIG_MARKER = `declare const __LUZPRESS_CONTENT_DIR__: string;
declare const __LUZPRESS_REPO__: string;
declare const __LUZPRESS_REPO_BRANCH__: string;
declare const __LUZPRESS_REPO_PATH__: string;
declare const __LUZPRESS_RAW_SOURCES__: Record<string, string>;
declare const __LUZPRESS_HEAD_DEFAULTS__: Head | null;

const contentDir = __LUZPRESS_CONTENT_DIR__;
const luzpressRepo = __LUZPRESS_REPO__;
const luzpressRepoBranch = __LUZPRESS_REPO_BRANCH__;
const luzpressRepoPath = __LUZPRESS_REPO_PATH__;
const mdxRawSources: Record<string, string> = __LUZPRESS_RAW_SOURCES__;
export const headDefaults: Head | null = __LUZPRESS_HEAD_DEFAULTS__;`;
