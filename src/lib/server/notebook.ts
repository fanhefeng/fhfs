import "@tanstack/react-start/server-only";
import index from "@/content/notebook/index.json";
import type { NoteBody, NoteSummary } from "@/lib/notebook";

const notes: NoteSummary[] = index as NoteSummary[];
const bodies = import.meta.glob<NoteBody>("../../content/notebook/pages/*.json", {
  import: "default",
});

export function getNotes(): NoteSummary[] {
  return notes;
}

export async function getNote(slug: string) {
  const summary = notes.find((note) => note.slug === slug);
  if (!summary) return null;
  const load = bodies[`../../content/notebook/pages/${slug}.json`];
  if (!load) throw new Error(`Missing notebook body: ${slug}`);
  return { ...summary, ...(await load()) };
}
