import { asc } from "drizzle-orm";
import { db } from "@/db";
import { abouts } from "@/db/schema";
import { requireAdminPage } from "@/lib/server/auth/session";

export async function loadPageData(_input: PageProps<"/admin">) {
  await requireAdminPage();
  const rows = await db.select().from(abouts).orderBy(asc(abouts.locale));
  return { rows };
}

export async function generateMetadata(_input: PageProps<"/admin">) {
  return {};
}
