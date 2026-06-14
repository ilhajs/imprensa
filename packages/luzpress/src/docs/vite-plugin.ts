import type { PluginOption } from "vite";
import type { LuzpressOptions } from "./options";
import { createLuzpressVitePlugins } from "./plugin/create-plugins";

export { createLuzpressVitePlugins } from "./plugin/create-plugins";

/** Vite meta-plugin preset for Luz documentation sites. */
export function luzpress(options: LuzpressOptions = {}): PluginOption[] {
  return createLuzpressVitePlugins(options);
}
