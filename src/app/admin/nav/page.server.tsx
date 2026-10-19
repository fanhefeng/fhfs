import { asc } from "drizzle-orm";
import { db } from "@/db";
import { navItems } from "@/db/schema";
import { requireAdminPage } from "@/lib/server/auth/session";

export async function loadPageData(_input: PageProps<"/admin">) {
  await requireAdminPage();
  const rows = await db
    .select({
      href: navItems.href,
      labelKey: navItems.labelKey,
      surfaces: navItems.surfaces,
      group: navItems.group,
    })
    .from(navItems)
    // The getter's own order (lib/server/content.ts), so the form lists the rows the
    // way the site shows them.
    .orderBy(asc(navItems.sort), asc(navItems.id));
  return { rows };
}

export async function generateMetadata(_input: PageProps<"/admin">) {
  return {};
}
