import { describe, expect, it } from "bun:test";
import {
  assertBalancedPreCode,
  assertTwoslashPopupRetag,
  checkPreCodeBalance,
} from "./html-assert";

describe("html-assert", () => {
  it("detects mis-nested pre/code", () => {
    const bad = "<pre><code></pre></code>";
    expect(checkPreCodeBalance(bad).ok).toBe(false);
    expect(() => assertBalancedPreCode(bad)).toThrow(/mis-nested/);
  });

  it("requires div popup when twoslash hover is present", () => {
    const bad = '<pre class="twoslash"><span class="twoslash-hover">x</span></pre>';
    expect(() => assertTwoslashPopupRetag(bad)).toThrow(/no <div class="twoslash-popup-code">/);
  });

  it("accepts retagged twoslash popup markup", () => {
    const ok =
      '<pre class="shiki twoslash"><span class="twoslash-hover"><div class="twoslash-popup-code">t</div></span></pre>';
    assertTwoslashPopupRetag(ok);
    assertBalancedPreCode(ok);
  });
});
