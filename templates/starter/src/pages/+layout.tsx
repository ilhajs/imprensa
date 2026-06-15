/** @jsxImportSource ilha */
import { defineLayout } from "@ilha/router";
import { Toaster } from "areia";
import ilha from "ilha";

/** Landing has no `luz-root` wrapper — its `bg-areia-background` was the strip under the footer. */
export default defineLayout((children) =>
  ilha.render(() => (
    <>
      <Toaster richColors closeButton />
      {children}
    </>
  )),
);
