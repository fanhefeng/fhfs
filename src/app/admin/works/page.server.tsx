import { asc } from "drizzle-orm";
import { db } from "@/db";
import { works } from "@/db/schema";

import { requireAdminPage } from "@/lib/server/auth/session";

export async function loadPageData(_input: PageProps<"/admin">) {
  await requireAdminPage();
  const rows = await db.select().from(works).orderBy(asc(works.sort), asc(works.key));
  return { rows };
}

export async function generateMetadata(_input: PageProps<"/admin">) {
  return {};
}
