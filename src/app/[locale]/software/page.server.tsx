import { pageLocale } from "@/i18n/page";
import { getApps } from "@/lib/server/content";
import { getGithubProjects } from "@/lib/server/github";
import { appGithubRepo } from "@/lib/githubData";
import { sectionMetadata } from "@/lib/server/seo";

export async function loadPageData(input: PageProps<"/[locale]/software">) {
  const { params } = input;
  const locale = await pageLocale(params);

  const rows = await getApps();
  const github = await getGithubProjects(rows.map(appGithubRepo));
  return { locale, rows, github };
}

export const generateMetadata = sectionMetadata("software", "/software");
