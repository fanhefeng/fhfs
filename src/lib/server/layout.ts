import "@tanstack/react-start/server-only";
import { getMessages } from "@/i18n/server";
import { getAllNavItems } from "@/lib/server/content";
import { trackFiles } from "@/lib/server/trackFiles";
import { showDrafts } from "@/lib/server/auth/session";
import { notFound } from "@/lib/navigation";
export async function loadLayout(locale: string) {
  if (locale !== "zh" && locale !== "en") notFound();
  const [messages, rows, preview] = await Promise.all([
    getMessages(locale),
    getAllNavItems(),
    showDrafts(),
  ]);
  const toLink = (row: (typeof rows)[number]) => ({
    href: row.href,
    labelKey: row.labelKey,
    group: row.group,
    door: row.surfaces.includes("header"),
  });
  return {
    messages,
    files: trackFiles(),
    preview,
    headerLinks: rows.filter((r) => r.surfaces.includes("header")).map(toLink),
    footerLinks: rows.filter((r) => r.surfaces.includes("footer")).map(toLink),
    menuLinks: rows.filter((r) => r.surfaces.includes("fullnav")).map(toLink),
    allLinks: rows.map(toLink),
  };
}
