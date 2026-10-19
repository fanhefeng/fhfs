import { requireAdminPage } from "@/lib/server/auth/session";

export async function loadPageData(_input: PageProps<"/admin">) {
  await requireAdminPage();
  return {};
}

export async function generateMetadata(_input: PageProps<"/admin">) {
  return {};
}
