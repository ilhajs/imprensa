import { describe, expect, test } from "bun:test";
import { AsyncLocalStorage } from "./async-local-storage-prerender";

describe("prerender AsyncLocalStorage shim", () => {
  test("sync run scopes and restores the store", () => {
    const als = new AsyncLocalStorage<string>();
    const seen = als.run("a", () => als.getStore());
    expect(seen).toBe("a");
    expect(als.getStore()).toBeUndefined();
  });

  test("store stays active across awaits in an async callback", async () => {
    // Router 0.8 primes route signals into the store, then reads them after
    // awaits (loaders, island renders). The store must survive suspension.
    const als = new AsyncLocalStorage<{ path: string }>();
    const result = await als.run({ path: "" }, async () => {
      const store = als.getStore();
      if (store) store.path = "/guide/libraries/router";
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
      return als.getStore()?.path;
    });
    expect(result).toBe("/guide/libraries/router");
    expect(als.getStore()).toBeUndefined();
  });

  test("restores previous store after nested async runs settle", async () => {
    const als = new AsyncLocalStorage<string>();
    await als.run("outer", async () => {
      await als.run("inner", async () => {
        await Promise.resolve();
        expect(als.getStore()).toBe("inner");
      });
      expect(als.getStore()).toBe("outer");
    });
    expect(als.getStore()).toBeUndefined();
  });

  test("restores the store when the callback throws synchronously", () => {
    const als = new AsyncLocalStorage<string>();
    expect(() =>
      als.run("a", () => {
        throw new Error("boom");
      }),
    ).toThrow("boom");
    expect(als.getStore()).toBeUndefined();
  });
});
