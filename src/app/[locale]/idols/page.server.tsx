import { pageLocale } from "@/i18n/page";

import { inLocale } from "@/lib/localized";
import { getIdols } from "@/lib/server/content";
import { sectionMetadata } from "@/lib/server/seo";

export async function loadPageData(input: PageProps<"/[locale]/idols">) {
  const { params } = input;
  const locale = await pageLocale(params);

  const idols = (await getIdols()).map((idol) => inLocale(idol, locale));
  return { locale, idols };
}

export const generateMetadata = sectionMetadata("idols", "/idols");
