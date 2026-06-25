import { describe, expect, it } from "bun:test";
import { encodeIlhaProps, parseIlhaPropsPayload } from "./snippet-props";

describe("snippet props transport", () => {
  it("round-trips JSON with apostrophes via base64 attribute encoding", () => {
    const props = { code: `const s = "it's fine";`, lang: "typescript" };
    const encoded = encodeIlhaProps(props);
    expect(encoded.startsWith("b64:")).toBe(true);
    expect(parseIlhaPropsPayload(encoded)).toEqual(props);
  });

  it("parses plain JSON from Ilha single-quoted attributes", () => {
    const raw = JSON.stringify({ code: "const a = 1", lang: "typescript" });
    expect(parseIlhaPropsPayload(raw)).toEqual({ code: "const a = 1", lang: "typescript" });
  });
});
