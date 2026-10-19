import { pageLocale } from "@/i18n/page";

import { sectionMetadata } from "@/lib/server/seo";

import { LAB_ENTRIES } from "@/components/lab/entries";

export async function loadPageData(input: PageProps<"/[locale]/lab">) {
  const { params } = input;
  await pageLocale(params);
  return {};
}

export const generateMetadata = sectionMetadata("lab", "/lab", { count: LAB_ENTRIES.length });
