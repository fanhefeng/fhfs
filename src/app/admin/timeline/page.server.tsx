import { asc } from "drizzle-orm";
import { db } from "@/db";
import { timelineEntries } from "@/db/schema";
import { requireAdminPage } from "@/lib/server/auth/session";

import type {} from "../ui/RecordForm";

export async function loadPageData(_input: PageProps<"/admin">) {
  await requireAdminPage();
  const rows = await db
    .select()
    .from(timelineEntries)
    .orderBy(asc(timelineEntries.sort), asc(timelineEntries.key));
  return { rows };
}

export async function generateMetadata(_input: PageProps<"/admin">) {
  return {};
}
