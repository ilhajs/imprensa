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
    try {
      return fn();
    } finally {
      this.#current = prev;
    }
  }

  enterWith(store: T): void {
    this.#current = store;
  }

  disable(): void {
    this.#current = undefined;
  }
}