import { Link } from "@/i18n/navigation";

import { labNeighbours, sourceUrl, type LabEntry, type LabSlug } from "@/components/lab/entries";
import { GROVE_PALETTE_KEYS } from "@/lib/grove/palettes";
import { StudySpec, type SpecRow } from "@/components/lab/StudySpec";
import {
  BLADES_NEAR_WIDE,
  BLADES_NEAR_SMALL,
  BLADES_FAR_WIDE,
  BLADES_FAR_SMALL,
} from "@/lib/grove/blades";
import { LENS_SLIDES } from "@/components/lab/lensSlides";

import { asset } from "@/lib/asset";

import { LabStudy } from "@/components/lab/LabStudy";

import { useTranslations } from "use-intl";

const STUDY_FILES: Partial<Record<LabSlug, () => Record<string, string>>> = {
  "scroll-video": () => ({ frames: asset("/lab/scroll-video/frames/") }),
  dissolve: () => ({ image: asset("/lab/dissolve/forest.jpg") }),
  grove: () => ({ plate: asset("/grove/moss-plate.webp") }),
  "lens-slider": () =>
    Object.fromEntries(LENS_SLIDES.map((name) => [name, asset(`/lab/lens/${name}.jpg`)])),
};
function Neighbour({
  entry,
  label,
  name,
  side,
}: {
  entry: LabEntry;
  label: string;
  name: string;
  side: "prev" | "next";
}) {
  const end = side === "next";
  return (
    <Link
      href={`/lab/${entry.slug}`}
      className={`group flex min-h-11 flex-col gap-1.5 py-5${end ? " items-end text-right" : ""}`}
    >
      <span className="font-mono text-meta uppercase tracking-meta text-fg-tertiary">
        {!end && <span aria-hidden="true">← </span>}
        {label} · {entry.ordinal}
        {end && <span aria-hidden="true"> →</span>}
      </span>
      <span className="text-body text-fg transition-colors group-hover:text-accent">{name}</span>
    </Link>
  );
}
export default function LabDemoPage({
  data,
}: {
  data: Awaited<ReturnType<typeof import("./page.server").loadPageData>>;
}) {
  const { entry, ns, text, entries, cards, wall, standIn } = data;
  const t = useTranslations("lab");
  const spec: SpecRow[] | null =
    entry.slug === "grove"
      ? [
          { label: t(`${ns}.specRuntime`), value: t(`${ns}.specRuntimeValue`) },
          { label: t(`${ns}.specPasses`), value: t(`${ns}.specPassesValue`) },
          { label: t(`${ns}.specAssets`), value: t(`${ns}.specAssetsValue`) },
          {
            label: t(`${ns}.specGeometry`),
            value: t(`${ns}.specGeometryValue`, {
              blades: BLADES_NEAR_WIDE + BLADES_FAR_WIDE,
              bladesSmall: BLADES_NEAR_SMALL + BLADES_FAR_SMALL,
            }),
          },
          {
            label: t(`${ns}.specVariants`),
            value: t(`${ns}.specVariantsValue`, { count: GROVE_PALETTE_KEYS.length }),
          },
          { label: t(`${ns}.specPixelRatio`), value: t(`${ns}.specPixelRatioValue`) },
          { label: t(`${ns}.specFallback`), value: t(`${ns}.specFallbackValue`) },
        ]
      : null;
  const credit =
    entry.slug === "workstation"
      ? t(`${ns}.credit`)
      : entry.slug === "screening" || entry.slug === "statue"
        ? text.credit
        : null;
  const { prev, next } = labNeighbours(entry.slug);
  return (
    <main id="main" className="flex-1">
      <header className="mx-auto w-full max-w-[720px] px-6 pt-24 pb-10">
        <Link
          href="/lab"
          className="hit-ext inline-flex min-h-11 items-center font-mono text-meta uppercase tracking-meta text-fg-tertiary transition-colors hover:text-accent"
        >
          {t("backToIndex")}
        </Link>
        <p className="mt-6 font-mono text-meta uppercase tracking-meta text-fg-tertiary">
          {t(`${ns}.tagline`)}
        </p>
        <h1 className="mt-3 text-display-sm text-fg">{t(`${ns}.name`)}</h1>
        <p className="mt-4 text-body text-fg-secondary">{t(`${ns}.summary`)}</p>
        {/* The demo's own file, up front; every file it touches is listed at
            the foot. Plain <a>: an external address. `lab.test.ts` proves
            every study names at least one source. */}
        <a
          href={sourceUrl(entry.sources[0]!)}
          target="_blank"
          rel="noreferrer"
          className="hit-ext mt-5 inline-flex min-h-11 items-center gap-1.5 font-mono text-meta uppercase tracking-meta text-fg-tertiary transition-colors hover:text-accent"
        >
          {t("viewSource")}
          <span aria-hidden="true">↗</span>
        </a>
      </header>

      <LabStudy
        slug={entry.slug}
        accent={entry.accent}
        text={text}
        entries={entries}
        cards={cards}
        wall={wall}
        standIn={standIn}
        files={STUDY_FILES[entry.slug]?.()}
      />

      <section className="mx-auto w-full max-w-[720px] px-6 pb-28 pt-20">
        <p className="text-body text-fg-secondary">{t(`${ns}.note`)}</p>
        {credit && <p className="mt-4 font-mono text-meta text-fg-tertiary">{credit}</p>}

        {spec && <StudySpec title={t(`${ns}.specTitle`)} rows={spec} />}

        {/* The files this study is made of, each a link to the repository.
            Plain <a>: an external address, which RouteTransition lets
            through on its own. */}
        <section className="mt-12" aria-labelledby="study-source">
          <h2
            id="study-source"
            className="font-mono text-meta uppercase tracking-meta text-fg-tertiary"
          >
            {t("source")}
          </h2>
          <p className="mt-3 text-caption text-fg-secondary">{t("sourceLede")}</p>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {entry.sources.map((path) => (
              <li key={path}>
                <a
                  href={sourceUrl(path)}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex min-h-11 items-center justify-between gap-4 py-2.5 font-mono text-caption text-fg transition-colors hover:text-accent"
                >
                  <span className="min-w-0 break-all">src/{path}</span>
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-fg-tertiary transition-colors group-hover:text-accent"
                  >
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* The studies either side, in the index's order — ordinal and name —
            so the series reads through without a trip back to the index. */}
        <nav
          aria-label={t("studyNav")}
          className="mt-12 grid grid-cols-2 gap-6 border-y border-line"
        >
          {prev ? (
            <Neighbour
              entry={prev}
              label={t("prev")}
              name={t(`items.${prev.key}.name`)}
              side="prev"
            />
          ) : (
            <span aria-hidden="true" />
          )}
          {next ? (
            <Neighbour
              entry={next}
              label={t("next")}
              name={t(`items.${next.key}.name`)}
              side="next"
            />
          ) : (
            <span aria-hidden="true" />
          )}
        </nav>

        <Link
          href="/lab"
          className="hit-ext mt-8 inline-flex min-h-11 items-center gap-2 rounded-chip border border-line px-4 py-2.5 text-caption text-fg transition-colors hover:border-accent hover:text-accent"
        >
          {t("back")}
          <span aria-hidden="true">→</span>
        </Link>
      </section>
    </main>
  );
}
