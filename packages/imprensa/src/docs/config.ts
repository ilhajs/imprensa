// Virtual module — replaced at build time by imprensa vite plugin
import type { ImprensaShikiOptions } from "../core/shiki";
import type { ImprensaSocialLink } from "./socials";

export type { ImprensaSocialLink, ImprensaSocialService } from "./socials";

export const socials: ImprensaSocialLink[] = [];
export const shiki: ImprensaShikiOptions = {};
export const hostname = "";
export const shikiThemes = { light: "night-owl-light", dark: "houston" };
