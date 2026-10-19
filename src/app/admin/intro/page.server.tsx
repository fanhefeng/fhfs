import { asc } from "drizzle-orm";
import { db } from "@/db";
import { introNodes } from "@/db/schema";
import { requireAdminPage } from "@/lib/server/auth/session";

import type {} from "../ui/RecordForm";

export async function loadPageData(_input: PageProps<"/admin">) {
  await requireAdminPage();
  const rows = await db
    .select()
    .from(introNodes)
    .orderBy(asc(introNodes.sort), asc(introNodes.key));
  return { rows };
}

export async function generateMetadata(_input: PageProps<"/admin">) {
  return {};
}
