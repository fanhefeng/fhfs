import { asc } from "drizzle-orm";
import { db } from "@/db";
import { copyBlocks } from "@/db/schema";
import { requireAdminPage } from "@/lib/server/auth/session";
import { COPY_GROUPS } from "@/lib/copy";
import { copyCatalogues } from "@/lib/server/copyCatalogue";
import { labEntry } from "@/components/lab/entries";

export async function loadPageData(input: PageProps<"/admin/copy">) {
  const { searchParams } = input;
  await requireAdminPage();
  const { ns, study: slug, scope } = await searchParams;
  const group = COPY_GROUPS.find((candidate) => candidate.id === ns);
  const study = ns === "lab" && typeof slug === "string" ? labEntry(slug) : undefined;
  const labIndex = ns === "lab" && !study && scope === "index";
  const [{ zh, en }, rows] = await Promise.all([
    copyCatalogues(),
    db.select().from(copyBlocks).orderBy(asc(copyBlocks.key)),
  ]);
  return { group, study, labIndex, zh, en, rows };
}

export async function generateMetadata(_input: PageProps<"/admin/copy">) {
  return {};
}
