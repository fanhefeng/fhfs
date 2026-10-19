type Entry = { value: Promise<unknown>; expires: number; tags: string[] };
const entries = new Map<string, Entry>();
export const SHARED_CONTENT_TTL_SECONDS = 30;

/** Bounded per-isolate cache. A short TTL also sees edits from fhfs-site. */
export function unstable_cache<A extends unknown[], R>(
  read: (...args: A) => Promise<R>,
  keys: string[] = [],
  options: { tags?: string[]; revalidate?: number | false } = {},
) {
  return (...args: A): Promise<R> => {
    const key = JSON.stringify([keys, args]);
    const existing = entries.get(key);
    if (existing && existing.expires > Date.now()) return existing.value as Promise<R>;
    const value = read(...args).catch((error: unknown) => {
      entries.delete(key);
      throw error;
    });
    if (entries.size >= 512) entries.delete(entries.keys().next().value!);
    entries.set(key, {
      value,
      expires:
        Date.now() +
        (typeof options.revalidate === "number" ? options.revalidate : SHARED_CONTENT_TTL_SECONDS) *
          1000,
      tags: options.tags ?? [],
    });
    return value;
  };
}
export function updateTag(tag: string) {
  for (const [key, entry] of entries) if (entry.tags.includes(tag)) entries.delete(key);
}
export function revalidateTag(tag: string, _options?: { expire: number }) {
  updateTag(tag);
}
