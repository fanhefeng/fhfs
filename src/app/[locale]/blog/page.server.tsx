import { pageLocale } from "@/i18n/page";
import { getPosts, getAllTags } from "@/lib/server/content";
import { sectionMetadata } from "@/lib/server/seo";

export async function loadPageData(input: PageProps<"/[locale]/blog">) {
  const { params } = input;
  const locale = await pageLocale(params);

  const posts = await getPosts(locale);
  const tags = await getAllTags(locale);
  return { locale, posts, tags };
}

export const generateMetadata = sectionMetadata("blog", "/blog");
