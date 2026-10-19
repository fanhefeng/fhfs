import { pageLocale } from "@/i18n/page";

import { sectionMetadata } from "@/lib/server/seo";
import { getIntroNodes } from "@/lib/server/content";

export async function loadPageData(input: PageProps<"/[locale]/intro">) {
  const { params } = input;
  const locale = await pageLocale(params);

  const nodes = await getIntroNodes();
  return { locale, nodes };
}

export const generateMetadata = sectionMetadata("intro", "/intro");
