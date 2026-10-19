import { asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { moments } from "@/db/schema";
import { requireAdminPage } from "@/lib/server/auth/session";

import type {} from "../ui/RecordForm";

export async function loadPageData(_input: PageProps<"/admin">) {
  await requireAdminPage();
  const rows = await db
    .select()
    .from(moments)
    .orderBy(desc(moments.pinned), desc(moments.postedAt), asc(moments.key));
  return { rows };
}

export async function generateMetadata(_input: PageProps<"/admin">) {
  return {};
}
