import { pageLocale } from "@/i18n/page";

import { inLocale } from "@/lib/localized";
import { getFilms } from "@/lib/server/content";
import { sectionMetadata } from "@/lib/server/seo";

export async function loadPageData(input: PageProps<"/[locale]/films">) {
  const { params } = input;
  const locale = await pageLocale(params);

  const films = (await getFilms()).map((film) => inLocale(film, locale));
  return { locale, films };
}

export const generateMetadata = sectionMetadata("films", "/films");
