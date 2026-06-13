import type { RawHtml } from "ilha";

/** JSX nodes returned from Ilha render helpers in luzpress components. */
export type LuzpressUiNode = RawHtml | string | number | boolean | null | undefined;

export type LuzpressUiTree = LuzpressUiNode | LuzpressUiTree[];
