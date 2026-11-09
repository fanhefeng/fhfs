import { notFound } from "@/lib/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { requireAdminPage } from "@/lib/server/auth/session";
import { importedEditor } from "../../../notebook.server";

export async function loadPageData(input: PageProps<"/admin/posts/[slug]/[locale]">) {
  const { params } = input;
  await requireAdminPage();
  const { slug, locale } = await params;
  if (locale !== "zh" && locale !== "en") notFound();
  const owners = await db.select().from(posts).where(eq(posts.slug, slug));
  const post = owners.find((row) => row.locale === locale);
  if (post) return { post, imported: false };
  if (owners.length) notFound();
  const imported = await importedEditor("/blog", slug, locale);
  if (!imported) notFound();
  return { post: imported, imported: true };
}

export async function generateMetadata(_input: PageProps<"/admin/posts/[slug]/[locale]">) {
  return {};
}
