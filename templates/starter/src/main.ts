import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./app.css";
import { createLuzpress } from "luzpress";

const luzpress = createLuzpress({ hostname: "https://luz.ilha.build" });

luzpress.init();

export const prerender = luzpress.prerender;
