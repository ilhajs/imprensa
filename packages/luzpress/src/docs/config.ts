// Virtual module — replaced at build time by luzpress vite plugin
import type { LuzpressShikiOptions } from "../core/shiki";
import type { LuzpressSocialLink } from "./socials";

export type { LuzpressSocialLink, LuzpressSocialService } from "./socials";

export const socials: LuzpressSocialLink[] = [];
export const shiki: LuzpressShikiOptions = {};
export const hostname = "";
export const shikiThemes = { light: "night-owl-light", dark: "houston" };
