import { AsyncLocalStorage } from "node:async_hooks";

const scope = new AsyncLocalStorage<boolean>();

/** Admin and authenticated previews read current content, even after a public cache hit. */
export function withContentCacheBypass<T>(bypass: boolean, read: () => T): T {
  return scope.run(bypass, read);
}

export function bypassContentCache(): boolean {
  return scope.getStore() === true;
}
