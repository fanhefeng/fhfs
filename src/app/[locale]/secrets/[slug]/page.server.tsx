import type { Metadata } from "@/lib/metadata";
import { notFound } from "@/lib/navigation";
import { hasLocale } from "use-intl";

import { routing } from "@/i18n/routing";
import { pageLocale } from "@/i18n/page";

import { getAdjacentSecrets, getSecret, getSecretEditions } from "@/lib/server/content";
import { showDrafts } from "@/lib/server/auth/session";

import { localeAlternates } from "@/lib/server/seo";

import { site } from "@/config/site";

export async function loadPageData(input: PageProps<"/[locale]/secrets/[slug]">) {
  const { params } = input;
  const locale = await pageLocale(params);
  const { slug } = await params;

  const secret = await getSecret(slug, locale, await showDrafts());
  if (!secret) notFound();
  const { older, newer } = await getAdjacentSecrets(secret.slug, locale);
  return { locale, slug, secret, older, newer };
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/secrets/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const secret = await getSecret(slug, locale, await showDrafts());
  if (!secret) return {};
  const alternates = localeAlternates(
    `/secrets/${slug}`,
    locale,
    (await getSecretEditions(slug)).map((edition) => edition.locale),
  );
  if (secret.isFallback) {
    alternates.canonical = `${site.url}/${secret.locale}/secrets/${slug}`;
  }
  return { title: secret.title, description: secret.summary, alternates };
}
