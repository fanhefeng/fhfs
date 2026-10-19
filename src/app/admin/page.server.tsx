import { requireAdminPage } from "@/lib/server/auth/session";

import { sectionCounts } from "./counts";

export async function loadPageData(_input: PageProps<"/admin">) {
  await requireAdminPage();
  const counts = await sectionCounts();
  return { counts };
}

export async function generateMetadata(_input: PageProps<"/admin">) {
  return {};
}
