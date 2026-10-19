import { notFound } from "@/lib/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { requireAdminPage } from "@/lib/server/auth/session";

export async function loadPageData(input: PageProps<"/admin/posts/[slug]/[locale]">) {
  const { params } = input;
  await requireAdminPage();
  const { slug, locale } = await params;
  if (locale !== "zh" && locale !== "en") notFound();
  const [post] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.slug, slug), eq(posts.locale, locale)))
    .limit(1);
  return { slug, locale, post };
}

export async function generateMetadata(_input: PageProps<"/admin/posts/[slug]/[locale]">) {
  return {};
}
