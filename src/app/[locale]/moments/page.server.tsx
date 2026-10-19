import { pageLocale } from "@/i18n/page";

import { getMoments } from "@/lib/server/content";

import { sectionMetadata } from "@/lib/server/seo";

export async function loadPageData(input: PageProps<"/[locale]/moments">) {
  const { params } = input;
  await pageLocale(params);

  const rows = await getMoments();
  return { rows };
}

export const generateMetadata = sectionMetadata("moments", "/moments");
