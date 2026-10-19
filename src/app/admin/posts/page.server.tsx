import { asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { requireAdminPage } from "@/lib/server/auth/session";

export async function loadPageData(_input: PageProps<"/admin">) {
  await requireAdminPage();
  const rows = await db
    .select({
      slug: posts.slug,
      locale: posts.locale,
      title: posts.title,
      date: posts.date,
      draft: posts.draft,
      readingMinutes: posts.readingMinutes,
    })
    .from(posts)
    .orderBy(desc(posts.date), asc(posts.locale));
  return { rows };
}

export async function generateMetadata(_input: PageProps<"/admin">) {
  return {};
}
