import type { Metadata } from "@/lib/metadata";

import { hasLocale } from "use-intl";

import { routing } from "@/i18n/routing";
import { pageLocale } from "@/i18n/page";

import { inLocale } from "@/lib/localized";
import { getFilm } from "@/lib/server/content";
import { showDrafts } from "@/lib/server/auth/session";
import { localeAlternates } from "@/lib/server/seo";

export async function loadPageData(input: PageProps<"/[locale]/films/[slug]">) {
  const { params } = input;
  const locale = await pageLocale(params);
  const { slug } = await params;
  const row = await getFilm(slug, await showDrafts());
  return { locale, slug, row };
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/films/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const film = await getFilm(slug, await showDrafts());
  if (!film) return {};
  return {
    title: inLocale(film.title, locale),
    description: inLocale(film.subtitle, locale),
    alternates: localeAlternates(`/films/${film.key}`, locale),
  };
}
