import type { RawHtml } from "ilha";

/** JSX nodes returned from Ilha render helpers in imprensa components. */
export type ImprensaUiNode = RawHtml | string | number | boolean | null | undefined;

export type ImprensaUiTree = ImprensaUiNode | ImprensaUiTree[];
