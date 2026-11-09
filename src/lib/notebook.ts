import type { Locale } from "@/i18n/routing";

export type NoteSection = "writing" | "life" | "it";
export type NoteFormat = "essay" | "fragment" | "study" | "reference" | "observation";
export type NoteText = Record<Locale, string>;

export type NoteSummary = {
  slug: string;
  title: string;
  section: NoteSection;
  format: NoteFormat;
  locale: Locale;
  summary: NoteText;
  tags: string[];
  date?: string;
  context?: NoteText;
  source?: { author: string; title: string; url?: string };
  readingMinutes: number;
};

export type NoteBody = {
  markdown: string;
  html: string;
  toc: { id: string; title: string }[];
};

/** Imported content joins the site's existing writing and life destinations. */
export function noteDestination(note: Pick<NoteSummary, "section">): "/blog" | "/secrets" {
  return note.section === "it" ? "/blog" : "/secrets";
}

export type NoteDetails = Pick<NoteSummary, "format" | "context" | "source"> &
  Pick<NoteBody, "toc">;

/** The Markdown renderer supplies the anchor ids. Use them after every edit. */
export function noteToc(html: string): NoteBody["toc"] {
  return [...html.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)].map((match) => ({
    id: match[1]!,
    title: match[2]!
      .replace(/<[^>]*>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">"),
  }));
}
