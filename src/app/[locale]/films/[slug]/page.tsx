import { notFound } from "@/lib/navigation";

import { Link } from "@/i18n/navigation";
import { asset } from "@/lib/asset";
import { FILM_FACTS } from "@/lib/films";
import { inLocale } from "@/lib/localized";

import { Reveal } from "@/components/fx/Reveal";
import { RoomMusic } from "@/components/fx/RoomMusic";
import { FilmStills, type StillItem } from "@/components/films/FilmStills";
import { useTranslations } from "use-intl";

export default function FilmPage({
  data,
}: {
  data: Awaited<ReturnType<typeof import("./page.server").loadPageData>>;
}) {
  const { locale, row } = data;
  const t = useTranslations("films");
  const tTracks = useTranslations("tracks");
  const tc = useTranslations("common");
  if (!row) notFound();
  const film = inLocale(row, locale);
  const stills: StillItem[] = film.stills.map((still) => ({ ...still, src: asset(still.src) }));
  const facts = FILM_FACTS.filter((fact) => film.facts[fact]);
  const label = "font-mono text-meta uppercase tracking-meta text-fg-tertiary";
  const backToIndex = (
    <Link
      href="/films"
      className="hit-ext inline-flex min-h-11 items-center font-mono text-meta uppercase tracking-meta text-fg-tertiary transition-colors hover:text-accent"
    >
      {t("backToIndex")}
    </Link>
  );
  return (
    <main id="main" className="mx-auto w-full max-w-[1040px] flex-1 px-6 pb-28 pt-32 md:pt-40">
      <Reveal as="header" className="mb-16 max-w-[720px]">
        {backToIndex}
        <h1 className="mt-6 text-display">{film.title}</h1>
        <p className={`mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 ${label}`}>
          {film.latin && <span className="text-accent">{film.latin}</span>}
          {film.latin && film.year && <span aria-hidden>·</span>}
          {film.year && <span className="tabular-nums">{film.year}</span>}
        </p>
        {film.track && (
          <RoomMusic
            track={film.track}
            tonight={tc("tonight")}
            title={tTracks(`${film.track}.title`)}
            artist={tTracks(`${film.track}.artist`)}
            className="mt-6"
          />
        )}
      </Reveal>

      {/* The synopsis: the facts, then what happens. */}
      {(facts.length > 0 || film.story.length > 0) && (
        <section aria-labelledby="film-synopsis" className="mb-24 max-w-[720px]">
          <Reveal className="mb-6">
            <h2 id="film-synopsis" className={label}>
              {t("sections.synopsis")}
            </h2>
          </Reveal>
          {facts.length > 0 && (
            <Reveal>
              <dl className="border-t border-line">
                {facts.map((fact) => (
                  <div
                    key={fact}
                    className="grid gap-1 border-b border-line py-3 sm:grid-cols-[9rem_1fr] sm:gap-6"
                  >
                    <dt className={label}>{t(`facts.${fact}`)}</dt>
                    <dd className="text-caption text-fg">{film.facts[fact]}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          )}
          {film.story.length > 0 && (
            <Reveal as="div" stagger={0.08} className="mt-10 space-y-5">
              {film.story.map((paragraph, i) => (
                <p key={i} className="max-w-[60ch] text-body text-fg-secondary">
                  {paragraph}
                </p>
              ))}
            </Reveal>
          )}
        </section>
      )}

      {/* The lines, word for word. */}
      {film.lines.length > 0 && (
        <section aria-labelledby="film-lines" className="mb-24 max-w-[720px]">
          <Reveal className="mb-8">
            <h2 id="film-lines" className={label}>
              {t("sections.lines")}
            </h2>
          </Reveal>
          <Reveal as="ul" stagger={0.08} className="space-y-10">
            {film.lines.map((line, i) => (
              <li key={i}>
                <blockquote className="border-l-2 border-accent pl-5">
                  <p className="font-accent text-[1.1875rem] leading-relaxed text-fg-secondary">
                    “{line.text}”
                  </p>
                  <footer className={`mt-3 ${label}`}>{line.meta}</footer>
                </blockquote>
              </li>
            ))}
          </Reveal>
        </section>
      )}

      {/* The stills. */}
      {stills.length > 0 && (
        <section aria-labelledby="film-stills" className="mb-16">
          <Reveal className="mb-8">
            <h2 id="film-stills" className={label}>
              {t("sections.stills")}
            </h2>
          </Reveal>
          <FilmStills
            ratio={film.ratio}
            stills={stills}
            text={{
              open: t("viewer.open"),
              close: t("viewer.close"),
              prev: t("viewer.prev"),
              next: t("viewer.next"),
              // Raw: the placeholders are the viewer's to fill, not ICU's.
              counter: t.raw("viewer.counter"),
              hint: t("viewer.hint"),
            }}
          />
        </section>
      )}

      <Reveal as="footer" className="max-w-[720px]">
        <p className="font-mono text-meta text-fg-tertiary">{film.credit}</p>
        <Link
          href="/films"
          className="hit-ext mt-8 inline-flex min-h-11 items-center gap-2 rounded-chip border border-line px-4 py-2.5 text-caption text-fg transition-colors hover:border-accent hover:text-accent"
        >
          {t("backToIndex")}
        </Link>
      </Reveal>
    </main>
  );
}
