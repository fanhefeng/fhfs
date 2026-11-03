import { pageLocale } from "@/i18n/page";

export async function loadPageData(input: PageProps<"/[locale]/blog/notes">) {
  const locale = await pageLocale(input.params);
  const section = input.searchParams.section;
  const destination = section === "life" || section === "writing" ? "/life" : "/blog";
  return { href: `/${locale}${destination}` };
}
