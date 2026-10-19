import { pageLocale } from "@/i18n/page";

import { getAllNavItems, getFilms, getIdols, getMoments, getSecrets } from "@/lib/server/content";
import { sectionMetadata } from "@/lib/server/seo";

export async function loadPageData(input: PageProps<"/[locale]/life">) {
  const { params } = input;
  const locale = await pageLocale(params);

  const rooms = (await getAllNavItems()).filter(
    (row) => row.group === "rooms" && !row.surfaces.includes("header"),
  );
  const [moments, secrets, idols, films] = await Promise.all([
    getMoments(),
    getSecrets(locale),
    getIdols(),
    getFilms(),
  ]);
  return { locale, rooms, moments, secrets, idols, films };
}

export const generateMetadata = sectionMetadata("life", "/life");
