import { pageLocale } from "@/i18n/page";
import { getSecrets } from "@/lib/server/content";
import { sectionMetadata } from "@/lib/server/seo";

export async function loadPageData(input: PageProps<"/[locale]/secrets">) {
  const { params } = input;
  const locale = await pageLocale(params);

  const items = await getSecrets(locale);
  return { locale, items };
}

export const generateMetadata = sectionMetadata("secrets", "/secrets");
