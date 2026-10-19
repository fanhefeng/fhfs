import { notFound } from "@/lib/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { secrets } from "@/db/schema";
import { requireAdminPage } from "@/lib/server/auth/session";

export async function loadPageData(input: PageProps<"/admin/secrets/[slug]/[locale]">) {
  const { params } = input;
  await requireAdminPage();
  const { slug, locale } = await params;
  if (locale !== "zh" && locale !== "en") notFound();
  const [secret] = await db
    .select()
    .from(secrets)
    .where(and(eq(secrets.slug, slug), eq(secrets.locale, locale)))
    .limit(1);
  return { slug, locale, secret };
}

export async function generateMetadata(_input: PageProps<"/admin/secrets/[slug]/[locale]">) {
  return {};
}
