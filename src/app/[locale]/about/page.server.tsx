import { pageLocale } from "@/i18n/page";

import { getAbout, getAllNavItems, getChips, getResumeExperiences } from "@/lib/server/content";
import { sectionMetadata } from "@/lib/server/seo";

export async function loadPageData(input: PageProps<"/[locale]/about">) {
  const { params } = input;
  const locale = await pageLocale(params);

  const about = await getAbout(locale);
  const chips = (await getChips()).map((chip) => ({
    label: chip.label[locale],
    tone: chip.tone,
  }));
  const [navRows, experiences] = await Promise.all([getAllNavItems(), getResumeExperiences()]);
  return { locale, about, chips, navRows, experiences };
}

export const generateMetadata = sectionMetadata("about", "/about");
