import { defineLayout } from "@ilha/router";
import ilha from "ilha";

export default defineLayout((children) =>
  ilha.render(() => (
    <div class="flex flex-col min-h-screen bg-areia-background text-areia-default">{children}</div>
  )),
);
