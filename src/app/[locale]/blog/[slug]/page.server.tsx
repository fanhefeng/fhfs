import type { Metadata } from "@/lib/metadata";
import { notFound } from "@/lib/navigation";
import { hasLocale } from "use-intl";

import { routing } from "@/i18n/routing";
import { pageLocale } from "@/i18n/page";

import { getAdjacentPosts, getPost, getPostEditions } from "@/lib/server/content";
import { showDrafts } from "@/lib/server/auth/session";

import { localeAlternates } from "@/lib/server/seo";

import { site } from "@/config/site";

export async function loadPageData(input: PageProps<"/[locale]/blog/[slug]">) {
  const { params } = input;
  const locale = await pageLocale(params);
  const { slug } = await params;

  const post = await getPost(slug, locale, await showDrafts());
  if (!post) notFound();
  const { older, newer } = await getAdjacentPosts(post.slug, locale);
  return { locale, slug, post, older, newer };
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/blog/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const post = await getPost(slug, locale, await showDrafts());
  if (!post) return {};
  // A fallback render is the other language's article under this prefix: its
  // canonical is that article, and hreflang lists only the languages that
  // really exist (`getPostEditions`), or crawlers would index the same text
  // twice.
  const alternates = localeAlternates(
    `/blog/${slug}`,
    locale,
    (await getPostEditions(slug)).map((edition) => edition.locale),
  );
  if (post.isFallback) {
    alternates.canonical = `${site.url}/${post.locale}/blog/${slug}`;
  }
  return {
    title: post.title,
    description: post.summary,
    alternates,
  };
}
