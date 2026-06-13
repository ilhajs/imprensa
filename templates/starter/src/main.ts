import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./app.css";
import { createLuzpress } from "luzpress/runtime";

const luzpress = createLuzpress({ hostname: "https://luz.ilha.build" });

void luzpress.init();
