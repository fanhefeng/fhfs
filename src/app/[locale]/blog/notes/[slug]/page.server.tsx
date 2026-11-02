import type { Metadata } from "@/lib/metadata";
import { pageLocale } from "@/i18n/page";
import { notFound } from "@/lib/navigation";
import { getNote, getNotes } from "@/lib/server/notebook";
import { localeAlternates } from "@/lib/server/seo";
import { site } from "@/config/site";

export async function loadPageData(input: PageProps<"/[locale]/blog/notes/[slug]">) {
  const locale = await pageLocale(input.params);
  const note = await getNote(input.params.slug);
  if (!note) notFound();
  const related = getNotes()
    .filter((item) => item.section === note.section && item.slug !== note.slug)
    .slice(0, 3);
  return { locale, note, related };
}

export async function generateMetadata(
  input: PageProps<"/[locale]/blog/notes/[slug]">,
): Promise<Metadata> {
  const locale = await pageLocale(input.params);
  const note = await getNote(input.params.slug);
  if (!note) return {};
  const alternates = localeAlternates(`/blog/notes/${note.slug}`, locale, [note.locale]);
  alternates.canonical = `${site.url}/${note.locale}/blog/notes/${note.slug}`;
  return { title: note.title, description: note.summary[locale], alternates };
}
