/**
 * Minimal AsyncLocalStorage for headless prerender (Node, single-threaded).
 * Ilha's router uses ALS for SSR head collection; Vite's client bundle externalizes
 * `node:async_hooks` to a non-constructor browser stub unless we alias to this module.
 */
export class AsyncLocalStorage<T = unknown> {
  #current: T | undefined;

  getStore(): T | undefined {
    return this.#current;
  }

  run<R>(store: T, fn: (...args: never[]) => R): R {
    const prev = this.#current;
    this.#current = store;
    let result: R;
    try {
      result = fn();
    } catch (error) {
      this.#current = prev;
      throw error;
    }
    // An async callback (router 0.8 wraps the whole SSR render in
    // als.run(store, async () => …)) must keep its store active across awaits,
    // not just until the first suspension — prerender renders pages one at a
    // time, so deferring the restore to settlement is safe here.
    if (result instanceof Promise) {
      return result.finally(() => {
        this.#current = prev;
      }) as R;
    }
    this.#current = prev;
    return result;
  }

  enterWith(store: T): void {
    this.#current = store;
  }

  disable(): void {
    this.#current = undefined;
  }
}
