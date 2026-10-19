import "@tanstack/react-start/server-only";
import { hasLocale } from "use-intl";
import { routing } from "@/i18n/routing";
import { validKey } from "@/lib/forms";
import { getRequest } from "@tanstack/react-start/server";
import { shareImagePath, type ShareImages } from "@/lib/shareImage";
import { env } from "./env";
import { getPosts } from "./content";

let images: ShareImages | undefined;
async function asset(path: string) {
  return env.ASSETS.fetch(new Request(new URL(path, getRequest().url)));
}
async function png(path: string) {
  const response = await asset(path);
  return new Response(response.body, {
    status: response.status,
    headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store" },
  });
}

export async function openGraphImage(locale: string, slug?: string) {
  if (!hasLocale(routing.locales, locale) || (slug !== undefined && !validKey(slug)))
    return new Response("Not found", { status: 404 });
  if (!slug) return png(`/share-images/cover-${locale}.png`);
  if (!images) {
    const response = await asset("/share-images/manifest.json");
    if (!response.ok) throw new Error("Share image manifest unavailable");
    images = await response.json<ShareImages>();
  }
  if (!images![`${locale}/${slug}`]) return png(`/share-images/cover-${locale}.png`);
  // Published summaries only: a draft preview must never escape into a share card.
  const [posts, alternate] = await Promise.all([
    getPosts(locale),
    getPosts(locale === "zh" ? "en" : "zh"),
  ]);
  return png(
    shareImagePath(
      images!,
      locale,
      slug,
      posts.find((post) => post.slug === slug),
      alternate.find((post) => post.slug === slug),
    ),
  );
}

export async function adminIcon() {
  return png("/share-images/admin-icon.png");
}
