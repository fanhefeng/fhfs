import { AsyncLocalStorage } from "node:async_hooks";

const scope = new AsyncLocalStorage<{
  bypass: boolean;
  pending: Map<string, Promise<unknown>>;
  snapshotMiss?: boolean;
}>();
const searchTransport = new AsyncLocalStorage<AbortSignal>();

/** Only the anonymous search route sets a deadline for its own Neon reads. */
export function withSearchTransportSignal<T>(signal: AbortSignal, read: () => T): T {
  return searchTransport.run(signal, read);
}

export function searchTransportSignal() {
  return searchTransport.getStore();
}

/** Pending I/O promises belong to their HTTP request, never the Worker isolate. */
export function withContentCacheBypass<T>(bypass: boolean, read: () => T): T {
  return scope.run({ bypass, pending: new Map() }, read);
}
export function bypassContentCache(): boolean {
  return scope.getStore()?.bypass === true;
}

/** A snapshot cannot determine the live existence of unrecorded content. */
export function recordSnapshotMiss() {
  const request = scope.getStore();
  if (request && !request.bypass) request.snapshotMiss = true;
}

export function publicSnapshotMissed() {
  return scope.getStore()?.snapshotMiss === true;
}

export function sharePendingRead<T>(key: string, read: () => Promise<T>): Promise<T> {
  const request = scope.getStore();
  if (!request || request.bypass) return read();
  const pending = request.pending.get(key);
  if (pending) return pending as Promise<T>;
  const result = read().finally(() => {
    if (request.pending.get(key) === result) request.pending.delete(key);
  });
  request.pending.set(key, result);
  return result;
}
