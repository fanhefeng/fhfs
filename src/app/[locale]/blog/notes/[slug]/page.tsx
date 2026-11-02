import { useTranslations, useFormatter } from "use-intl";
import { Link } from "@/i18n/navigation";
import { htmlLang } from "@/i18n/routing";
import { Mdx } from "@/components/blog/Mdx";
import { ArticleSummary, FallbackNotice } from "@/components/blog/ArticleParts";
import { RadialFab } from "@/components/fx/RadialFab";

export default function NotePage({
  data,
}: {
  data: Awaited<ReturnType<typeof import("./page.server").loadPageData>>;
}) {
  const { locale, note, related } = data;
  const t = useTranslations("notebook");
  const format = useFormatter();
  return (
    <>
      <main id="main" className="mx-auto w-full max-w-[760px] flex-1 px-6 pb-28 pt-32 md:pt-40">
        <header className="mb-10">
          <Link
            href={`/blog/notes?section=${note.section}`}
            className="hit-ext font-mono text-meta uppercase tracking-meta text-fg-secondary transition-colors hover:text-accent"
          >
            {t("title")} <span aria-hidden> / </span>
            {t(`sections.${note.section}`)}
          </Link>
          <p className="mb-5 mt-8 flex flex-wrap gap-x-3 gap-y-1 font-mono text-meta uppercase tracking-meta text-fg-tertiary">
            <span className="text-accent">{t(`formats.${note.format}`)}</span>
            {note.date && (
              <time dateTime={note.date}>
                {format.dateTime(new Date(`${note.date}T12:00:00+08:00`), {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            )}
            <span>{t("readingTime", { minutes: note.readingMinutes })}</span>
            {!note.date && <span>{t("undated")}</span>}
          </p>
          <h1 lang={htmlLang(note.locale)} className="text-title md:text-display-sm">
            {note.title}
          </h1>
          <ArticleSummary>{note.summary[locale]}</ArticleSummary>
          {note.context && (
            <p className="mt-6 border-l border-line pl-4 text-small leading-relaxed text-fg-secondary">
              {note.context[locale]}
            </p>
          )}
        </header>

        {note.locale !== locale && (
          <FallbackNotice locale={locale}>
            {t(note.locale === "zh" ? "fallbackZh" : "fallbackEn")}
          </FallbackNotice>
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
                {t("readOriginal")} <span aria-hidden>↗</span>
              </a>
            )}
          </aside>
        )}

        {note.toc.length > 2 && (
          <details className="mb-10 rounded-[var(--r-card)] border border-line px-5 py-4">
            <summary className="min-h-6 cursor-pointer font-mono text-meta uppercase tracking-meta text-fg-secondary">
              {t("contents", { count: note.toc.length })}
            </summary>
            <nav
              aria-label={t("contentsAria")}
              lang={htmlLang(note.locale)}
              className="mt-4 max-h-80 overflow-y-auto overscroll-contain"
              data-lenis-prevent
            >
              <ol className="space-y-1">
                {note.toc.map((heading) => (
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
        )}
        <article lang={htmlLang(note.locale)} className="min-w-0 [overflow-wrap:anywhere]">
          <Mdx html={note.html} />
        </article>

        {related.length > 0 && (
          <nav aria-label={t("related")} className="mt-16 border-t border-line pt-6">
            <h2 className="mb-4 font-mono text-meta uppercase tracking-meta text-fg-tertiary">
              {t("related")}
            </h2>
            <ul>
              {related.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/blog/notes/${item.slug}`}
                    lang={htmlLang(item.locale)}
                    className="block py-3 text-body text-fg-secondary transition-colors hover:text-accent"
                  >
                    {item.title} <span aria-hidden>↗</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <p className="mt-12">
          <Link
            href={`/blog/notes?section=${note.section}`}
            className="hit-ext font-mono text-meta uppercase tracking-meta text-fg-secondary underline decoration-line underline-offset-4 hover:text-accent"
          >
            {t("backToList")}
          </Link>
        </p>
      </main>
      <RadialFab shareTitle={note.title} />
    </>
  );
}
