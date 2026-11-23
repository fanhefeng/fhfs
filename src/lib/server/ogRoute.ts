import "@tanstack/react-start/server-only";
import { hasLocale } from "use-intl";
import { routing } from "@/i18n/routing";
import { validKey } from "@/lib/forms";
import { getRequest } from "@tanstack/react-start/server";
import { env } from "./env";

async function png(path: string) {
  const response = await env.ASSETS.fetch(new Request(new URL(path, getRequest().url)));
  return new Response(response.body, {
    status: response.status,
    headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store" },
  });
}

export async function openGraphImage(locale: string, slug?: string) {
  if (!hasLocale(routing.locales, locale) || (slug !== undefined && !validKey(slug)))
    return new Response("Not found", { status: 404 });
  return png(`/share-images/cover-${locale}.png`);
}

export async function adminIcon() {
  return png("/share-images/admin-icon.png");
}
