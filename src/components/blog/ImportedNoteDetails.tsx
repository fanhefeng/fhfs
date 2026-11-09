import { useTranslations } from "use-intl";
import { htmlLang, type Locale } from "@/i18n/routing";
import type { NoteDetails } from "@/lib/notebook";

/** Keep the imported context, attribution and chapter links inside existing articles. */
export function ImportedNoteDetails({
  note,
  locale,
  textLocale,
}: {
  note: NoteDetails;
  locale: Locale;
  textLocale: Locale;
}) {
  const t = useTranslations("notebook");
  return (
    <div lang={htmlLang(locale)}>
      {note.context && (
        <p className="mb-10 border-l border-line pl-4 text-small leading-relaxed text-fg-secondary">
          {note.context[locale]}
        </p>
      )}
      {note.source && (
        <aside className="mb-10 border-y border-line py-5 text-small leading-relaxed">
          <p className="font-mono text-meta uppercase tracking-meta text-fg-tertiary">
            {t(note.format === "reference" ? "referenceSource" : "source")}
          </p>
          <p className="mt-2 text-fg-secondary">
            {note.source.author} · {note.source.title}
          </p>
          {note.source.url && (
            <a
              href={note.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block min-h-6 text-accent underline underline-offset-4"
            >
              {t("readOriginal")}
            </a>
          )}
        </aside>
      )}
      <ArticleContents toc={note.toc} locale={locale} textLocale={textLocale} />
    </div>
  );
}

export function ArticleContents({
  toc,
  locale,
  textLocale,
}: {
  toc: NoteDetails["toc"];
  locale: Locale;
  textLocale: Locale;
}) {
  const t = useTranslations("notebook");
  if (toc.length <= 2) return null;
  return (
    <details
      lang={htmlLang(locale)}
      className="group/toc mb-10 rounded-[var(--r-card)] border border-line px-5 py-3"
    >
      <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center font-mono text-meta uppercase tracking-meta text-fg-secondary underline decoration-line underline-offset-4 hover:text-accent focus-visible:text-accent [&::-webkit-details-marker]:hidden">
        <span className="group-open/toc:hidden">{t("contents", { count: toc.length })}</span>
        <span className="hidden group-open/toc:inline">{t("hideContents")}</span>
      </summary>
      <nav
        aria-label={t("contentsAria")}
        lang={htmlLang(textLocale)}
        className="mt-4 max-h-80 overflow-y-auto overscroll-contain"
        data-lenis-prevent
      >
        <ol className="space-y-1">
          {toc.map((heading) => (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                className="block py-2 text-small leading-relaxed text-fg-secondary transition-colors hover:text-accent"
              >
                {heading.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </details>
  );
}
