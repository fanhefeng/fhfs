import { asc } from "drizzle-orm";
import { db } from "@/db";
import { chips } from "@/db/schema";
import { requireAdminPage } from "@/lib/server/auth/session";

export async function loadPageData(_input: PageProps<"/admin">) {
  await requireAdminPage();
  const rows = await db
    .select({ label: chips.label, tone: chips.tone })
    .from(chips)
    .orderBy(asc(chips.sort), asc(chips.id));
  return { rows };
}

export async function generateMetadata(_input: PageProps<"/admin">) {
  return {};
}
