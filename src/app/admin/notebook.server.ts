import "@tanstack/react-start/server-only";
import { getNote, getNotes } from "@/lib/server/notebook";
import { noteDestination } from "@/lib/notebook";
import type { Locale } from "@/i18n/routing";

type Destination = ReturnType<typeof noteDestination>;

export function importedRows(destination: Destination) {
  return getNotes()
    .filter((note) => noteDestination(note) === destination)
    .map((note) => ({
      slug: note.slug,
      locale: note.locale,
      title: note.title,
      date: note.date ?? null,
      readingMinutes: note.readingMinutes,
      draft: false,
      imported: true as const,
    }));
}

export async function importedEditor(destination: Destination, slug: string, locale: Locale) {
  const note = await getNote(slug);
  if (!note || noteDestination(note) !== destination || note.locale !== locale) return null;
  const context = note.context?.[locale];
  // The public import shows credit outside the body. Once it is a database
  // article, keep that credit with the editable Markdown on both deployments.
  const source = note.format === "reference" ? undefined : note.source;
  const credit = source
    ? `${source.author} · ${source.url ? `[${source.title}](${source.url})` : source.title}`
    : undefined;
  return {
    slug,
    locale,
    title: note.title,
    date: note.date ?? "",
    summary: note.summary[locale],
    tags: note.tags,
    draft: false,
    bodyMd: [context && `> ${context}`, note.markdown, credit && `> ${credit}`]
      .filter(Boolean)
      .join("\n\n"),
  };
}
