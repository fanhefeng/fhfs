import "@tanstack/react-start/server-only";
import { hasLocale } from "use-intl";
import { routing } from "@/i18n/routing";
import { validKey } from "@/lib/forms";
import { unstable_cache } from "./cache";
import { TAGS } from "./content";

// Cache bytes, never a Response stream or a promise tied to another request.
const image = unstable_cache(
  async (locale: string, slug?: string) => {
    const render = slug ? (await import("./ogPost")).default : (await import("./ogCover")).default;
    const response = await render({ params: Promise.resolve({ locale, slug: slug ?? "" }) });
    return new Uint8Array(await response.arrayBuffer());
  },
  ["share-image"],
  { tags: [TAGS.content, TAGS.posts] },
);

export async function openGraphImage(locale: string, slug?: string) {
  if (!hasLocale(routing.locales, locale) || (slug !== undefined && !validKey(slug)))
    return new Response("Not found", { status: 404 });
  return new Response(await image(locale, slug), {
    headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store" },
  });
}

export async function adminIcon() {
  return (await import("./ogIcon")).default();
}
