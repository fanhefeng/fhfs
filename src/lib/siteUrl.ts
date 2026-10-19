/** This deployment's production origin. */
export const FALLBACK_SITE_URL = "https://fhfs.fhfs.workers.dev";

/**
 * The production origin, no trailing slash.
 *
 * The public build setting takes priority. A different deployment's platform
 * variables must never move our canonical URLs, feeds, or share images.
 */
export function siteUrl(env: Record<string, string | undefined>): string {
  const explicit = env.VITE_SITE_URL?.trim() || env.SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  return FALLBACK_SITE_URL;
}
