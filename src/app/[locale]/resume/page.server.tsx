import { pageLocale } from "@/i18n/page";

import { getResumeExperiences, getResumeProfile } from "@/lib/server/content";
import { sectionMetadata } from "@/lib/server/seo";

export async function loadPageData(input: PageProps<"/[locale]/resume">) {
  const { params } = input;
  const locale = await pageLocale(params);

  const [profile, experiences] = await Promise.all([getResumeProfile(), getResumeExperiences()]);
  return { locale, profile, experiences };
}

export const generateMetadata = sectionMetadata("resume", "/resume");
