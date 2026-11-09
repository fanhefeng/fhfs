import "@tanstack/react-start/server-only";
import index from "@/content/notebook/index.json";
import { noteDestination, noteToc, type NoteBody, type NoteSummary } from "@/lib/notebook";
import type { Locale } from "@/i18n/routing";

const notes: NoteSummary[] = index as NoteSummary[];
const bodies = import.meta.glob<NoteBody>("../../content/notebook/pages/*.json", {
  import: "default",
});

export function getNotes(): NoteSummary[] {
  return notes;
}

export function getImportedSummaries(destination: "/blog" | "/secrets", locale: Locale) {
  return notes
    .filter((note) => noteDestination(note) === destination)
    .map((note) => ({
      slug: note.slug,
      locale: note.locale,
      title: note.title,
      date: note.date ?? null,
      summary: note.summary[locale],
      tags: note.tags,
      format: note.format,
      readingMinutes: note.readingMinutes,
      isFallback: note.locale !== locale,
    }));
}

/** Database ownership includes drafts, even though only public rows are returned. */
export function mergeImported<T extends { slug: string }>(
  rows: T[],
  imported: T[],
  owners: readonly { slug: string }[],
): T[] {
  const slugs = new Set(owners.map((row) => row.slug));
  return [...rows, ...imported.filter((row) => !slugs.has(row.slug))];
}

export async function getImportedArticle(
  destination: "/blog" | "/secrets",
  slug: string,
  locale: Locale,
) {
  const summary = getImportedSummaries(destination, locale).find((note) => note.slug === slug);
  if (!summary) return null;
  const note = await getNote(slug);
  if (!note) return null;
  return {
    ...summary,
    html: note.html,
    note: { format: note.format, context: note.context, source: note.source, toc: note.toc },
  };
}

export async function getNote(slug: string) {
  const summary = notes.find((note) => note.slug === slug);
  if (!summary) return null;
  const load = bodies[`../../content/notebook/pages/${slug}.json`];
  if (!load) throw new Error(`Missing notebook body: ${slug}`);
  return { ...summary, ...(await load()) };
}

export function getEditedNoteToc(destination: "/blog" | "/secrets", slug: string, html: string) {
  return notes.some((note) => note.slug === slug && noteDestination(note) === destination)
    ? noteToc(html)
    : undefined;
}
