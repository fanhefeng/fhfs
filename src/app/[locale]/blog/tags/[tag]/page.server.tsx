import type { Metadata } from "@/lib/metadata";

import { hasLocale } from "use-intl";
import { getTranslations } from "@/i18n/server";
import { routing } from "@/i18n/routing";
import { pageLocale } from "@/i18n/page";

import { site } from "@/config/site";
import { feedTypes } from "@/lib/server/seo";
import { getPostsByTag } from "@/lib/server/content";

export async function loadPageData(input: PageProps<"/[locale]/blog/tags/[tag]">) {
  const { params } = input;
  const locale = await pageLocale(params);
  const { tag } = await params;
  const posts = await getPostsByTag(tag, locale);
  return { locale, tag, posts };
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/blog/tags/[tag]">): Promise<Metadata> {
  const { locale, tag } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "blog" });
  const posts = await getPostsByTag(tag, locale);
  return {
    title: t("taggedWith", { tag }),
    description: `${t("taggedWith", { tag })} · ${t("filterSummary", { count: posts.length })}`,
    // Tags are per-locale strings, not translations of each other, so there
    // is no hreflang to declare — only this page's own canonical.
    alternates: {
      canonical: `${site.url}/${locale}/blog/tags/${encodeURIComponent(tag)}`,
      types: feedTypes(locale),
    },
  };
}
