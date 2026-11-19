import { hasLocale } from "use-intl";
import { routing } from "@/i18n/routing";
import { site } from "@/config/site";
import { validKey } from "@/lib/forms";
import { getPost } from "@/lib/server/content";

export async function GET(locale: string, slug: string) {
  if (!hasLocale(routing.locales, locale) || !validKey(slug))
    return new Response("Not found", { status: 404 });

  const post = await getPost(slug, locale);
  if (!post) return new Response("Not found", { status: 404 });

  return Response.json({
    path: `/${locale}/blog/${post.slug}`,
    canonicalUrl: `${site.url}/${post.locale}/blog/${post.slug}`,
    locale: post.locale,
    isFallback: post.isFallback,
    title: post.title,
    summary: post.summary,
    date: post.date,
    tags: post.tags,
    html: post.html,
  });
}
