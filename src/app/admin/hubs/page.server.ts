import "@tanstack/react-start/server-only";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { copyBlocks } from "@/db/schema";
import { LAB_ENTRIES, LAB_GROUPS } from "@/components/lab/entries";
import { requireAdminPage } from "@/lib/server/auth/session";
import { copyCatalogues } from "@/lib/server/copyCatalogue";
import type { Hub } from "./Hub";

export type HubData = {
  studies: { id: string; label: string; entries: { slug: string; title: string }[] }[];
};

export async function loadHub(hub: Hub): Promise<HubData> {
  await requireAdminPage();
  if (hub !== "lab") return { studies: [] };

  const keys = [
    ...LAB_GROUPS.map((group) => `lab.groups.${group}.title`),
    ...LAB_ENTRIES.map((entry) => `lab.items.${entry.key}.name`),
  ];
  const [{ zh }, rows] = await Promise.all([
    copyCatalogues(),
    db
      .select({ key: copyBlocks.key, zh: copyBlocks.zh })
      .from(copyBlocks)
      .where(inArray(copyBlocks.key, keys)),
  ]);
  const overrides = new Map(rows.map((row) => [row.key, row.zh]));
  const copy = (key: string) => overrides.get(key) ?? zh[key] ?? key;
  return {
    studies: LAB_GROUPS.map((group) => ({
      id: group,
      label: copy(`lab.groups.${group}.title`),
      entries: LAB_ENTRIES.filter((entry) => entry.group === group).map((entry) => ({
        slug: entry.slug,
        title: copy(`lab.items.${entry.key}.name`),
      })),
    })),
  };
}
