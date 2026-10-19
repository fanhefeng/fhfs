import { bypassContentCache } from "./cacheScope";

type Entry = { value: unknown; expires: number; tags: string[]; order: number };
const entries = new Map<string, Entry>();
let revision = 0;
let readOrder = 0;
export const SHARED_CONTENT_TTL_SECONDS = 30;

/** Cache completed values only: Worker I/O promises belong to their initiating request. */
export function unstable_cache<A extends unknown[], R>(
  read: (...args: A) => Promise<R>,
  keys: string[] = [],
  options: { tags?: string[]; revalidate?: number | false } = {},
) {
  return async (...args: A): Promise<R> => {
    if (bypassContentCache()) return read(...args);
    const key = JSON.stringify([keys, args]);
    const existing = entries.get(key);
    if (existing && existing.expires > Date.now()) return existing.value as R;
    const started = Date.now();
    const order = ++readOrder;
    const atRevision = revision;
    const value = await read(...args);
    const lifetime = Math.max(
      0,
      Math.min(
        typeof options.revalidate === "number" ? options.revalidate : SHARED_CONTENT_TTL_SECONDS,
        SHARED_CONTENT_TTL_SECONDS,
      ),
    );
    const expires = started + lifetime * 1000;
    // A save during this read must not repopulate the cache with pre-save data.
    if (revision !== atRevision || expires <= Date.now()) return value;
    if ((entries.get(key)?.order ?? -Infinity) > order) return value;
    if (entries.size >= 512) entries.delete(entries.keys().next().value!);
    entries.set(key, {
      value,
      expires,
      order,
      tags: options.tags ?? [],
    });
    return value;
  };
}
export function updateTag(tag: string) {
  revision++;
  for (const [key, entry] of entries) if (entry.tags.includes(tag)) entries.delete(key);
}
export function revalidateTag(tag: string, _options?: { expire: number }) {
  updateTag(tag);
}
