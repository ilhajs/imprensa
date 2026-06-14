import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./app.css";
import { createLuzpress } from "luzpress/runtime";

const luzpress = createLuzpress();

void luzpress.init();

export const prerender = luzpress.prerender;
