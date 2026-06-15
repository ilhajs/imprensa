import type { PluginOption } from "vite";
import type { ImprensaOptions } from "./options";
import { createImprensaVitePlugins } from "./plugin/create-plugins";

export { createImprensaVitePlugins } from "./plugin/create-plugins";

/** Vite meta-plugin preset for Imprensa documentation sites. */
export function imprensa(options: ImprensaOptions = {}): PluginOption[] {
  return createImprensaVitePlugins(options);
}
