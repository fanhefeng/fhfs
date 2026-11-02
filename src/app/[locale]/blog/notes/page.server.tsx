import { pageLocale } from "@/i18n/page";
import { sectionMetadata } from "@/lib/server/seo";
import { getNotes } from "@/lib/server/notebook";

export async function loadPageData(input: PageProps<"/[locale]/blog/notes">) {
  const locale = await pageLocale(input.params);
  return { locale, notes: getNotes() };
}

export const generateMetadata = sectionMetadata("notebook", "/blog/notes");
