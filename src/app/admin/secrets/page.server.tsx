import { asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { secrets } from "@/db/schema";
import { requireAdminPage } from "@/lib/server/auth/session";

export async function loadPageData(_input: PageProps<"/admin">) {
  await requireAdminPage();
  const rows = await db
    .select({
      slug: secrets.slug,
      locale: secrets.locale,
      kind: secrets.kind,
      title: secrets.title,
      date: secrets.date,
      draft: secrets.draft,
      duration: secrets.duration,
      audio: secrets.audio,
      readingMinutes: secrets.readingMinutes,
    })
    .from(secrets)
    .orderBy(desc(secrets.date), asc(secrets.locale));
  return { rows };
}

export async function generateMetadata(_input: PageProps<"/admin">) {
  return {};
}
