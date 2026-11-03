import { pageLocale } from "@/i18n/page";
import { notFound } from "@/lib/navigation";
import { noteDestination } from "@/lib/notebook";
import { getNotes } from "@/lib/server/notebook";

export async function loadPageData(input: PageProps<"/[locale]/blog/notes/[slug]">) {
  const locale = await pageLocale(input.params);
  const note = getNotes().find((item) => item.slug === input.params.slug);
  if (!note) notFound();
  return { href: `/${locale}${noteDestination(note)}/${note.slug}` };
}
