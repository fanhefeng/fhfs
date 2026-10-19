import type { Metadata } from "@/lib/metadata";

import { hasLocale } from "use-intl";

import { routing } from "@/i18n/routing";
import { pageLocale } from "@/i18n/page";

import { inLocale } from "@/lib/localized";
import { getIdol } from "@/lib/server/content";
import { showDrafts } from "@/lib/server/auth/session";
import { localeAlternates } from "@/lib/server/seo";

export async function loadPageData(input: PageProps<"/[locale]/idols/[slug]">) {
  const { params } = input;
  const locale = await pageLocale(params);
  const { slug } = await params;
  const row = await getIdol(slug, await showDrafts());
  return { locale, slug, row };
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/idols/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const idol = await getIdol(slug, await showDrafts());
  if (!idol) return {};
  return {
    title: inLocale(idol.name, locale),
    description: inLocale(idol.lede, locale),
    alternates: localeAlternates(`/idols/${idol.key}`, locale),
  };
}
