import type { Metadata } from "@/lib/metadata";
import { hasLocale } from "use-intl";

import { routing } from "@/i18n/routing";
import { pageLocale } from "@/i18n/page";
import { localeAlternates } from "@/lib/server/seo";

import { getPosts, getApps, getMoments } from "@/lib/server/content";
import { getLatestReleases } from "@/lib/server/github";

export async function loadPageData(input: PageProps<"/[locale]">) {
  const { params } = input;
  const locale = await pageLocale(params);

  const [allPosts, allApps, moments] = await Promise.all([
    getPosts(locale),
    getApps(),
    getMoments(),
  ]);
  const releases = await getLatestReleases(allApps.map((app) => app.repo));
  return { locale, allPosts, allApps, moments, releases };
}

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  return { alternates: localeAlternates("", locale) };
}
