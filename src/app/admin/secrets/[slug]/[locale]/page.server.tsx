import { notFound } from "@/lib/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { secrets } from "@/db/schema";
import { requireAdminPage } from "@/lib/server/auth/session";
import { importedEditor } from "../../../notebook.server";

export async function loadPageData(input: PageProps<"/admin/secrets/[slug]/[locale]">) {
  const { params } = input;
  await requireAdminPage();
  const { slug, locale } = await params;
  if (locale !== "zh" && locale !== "en") notFound();
  const owners = await db.select().from(secrets).where(eq(secrets.slug, slug));
  const secret = owners.find((row) => row.locale === locale);
  if (secret) return { secret, imported: false };
  if (owners.length) notFound();
  const imported = await importedEditor("/secrets", slug, locale);
  if (!imported) notFound();
  return {
    secret: { ...imported, kind: "essay" as const, audio: null, duration: null },
    imported: true,
  };
}

export async function generateMetadata(_input: PageProps<"/admin/secrets/[slug]/[locale]">) {
  return {};
}
