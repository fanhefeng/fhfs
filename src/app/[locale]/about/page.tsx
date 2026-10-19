import { Link } from "@/i18n/navigation";
import { site } from "@/config/site";

import { Mdx } from "@/components/blog/Mdx";
import { DotDoodle } from "@/components/fx/DotDoodle";
import { Reveal } from "@/components/fx/Reveal";
import { ManifestoBand } from "@/components/about/ManifestoBand";
import { StickerWall } from "@/components/about/StickerWall";
import { Changelog, type ChangelogEntry } from "@/components/about/Changelog";
import { Colophon } from "@/components/about/Colophon";
import { useTranslations } from "use-intl";

export default function AboutPage({
  data,
}: {
  data: Awaited<ReturnType<typeof import("./page.server").loadPageData>>;
}) {
  const { locale, about, chips, navRows, experiences } = data;
  const t = useTranslations("about");
  const tNav = useTranslations("nav");
  const career: ChangelogEntry[] = experiences.map((row) => {
    const period = row.period[locale];
    return {
      id: row.key,
      label: period,
      year: /\d{4}/.exec(period)?.[0] ?? "—",
      title: row.company[locale],
      note: row.role[locale],
    };
  });
  const meRows = navRows.filter((row) => row.group === "me" && !row.surfaces.includes("header"));
  const column = "mx-auto w-full max-w-[720px] px-6";
  const kicker = "font-mono text-meta uppercase tracking-meta text-fg-tertiary";
  return (
    <main id="main" className="flex-1 pb-24">
      <header className={`${column} pt-24 sm:pt-32`}>
        <p className={kicker}>{t("title")}</p>
        {/* The name, set in a dot matrix that keeps it half-hidden until you
            point at it. The heading still *is* the name for anything that
            reads the page — the canvas is decoration layered over it. */}
        <h1 className="mt-5">
          <DotDoodle text={site.author} className="h-[clamp(3rem,13vw,5rem)]" />
          <span className="sr-only">{site.author}</span>
        </h1>
        <p className="accent-light mt-4 font-accent text-title leading-tight text-fg-secondary">
          {t("keywords")}
        </p>
        <p className="mt-6 max-w-[46ch] text-body text-fg-secondary">{t("lead")}</p>
      </header>

      {/* Full-bleed: the band writes its own 100vw stage on desktop. */}
      <ManifestoBand />

      <div className={column}>
        {about && <Mdx html={about.html} />}

        {career.length > 0 && (
          <Changelog
            entries={career}
            title={t("careerTitle")}
            ariaLabel={t("careerAria")}
            className="mt-20"
          />
        )}

        <StickerWall
          chips={chips}
          title={t("stickersTitle")}
          hint={t("stickersHint")}
          ariaLabel={t("stickersAria")}
          className="mt-20"
        />

        {/* The rest of 关于. The whole row is the link, so it is a target a
            thumb can hit without the name having to be long. */}
        {meRows.length > 0 && (
          <section aria-labelledby="about-more" className="mt-20">
            <h2 id="about-more" className={`${kicker} mb-4`}>
              {t("moreTitle")}
            </h2>
            <Reveal as="ul" role="list" stagger={0.06} className="border-t border-line">
              {meRows.map((row) => (
                <li key={row.href} className="border-b border-line">
                  <Link
                    href={row.href}
                    className="group flex min-h-14 items-center justify-between gap-4 text-heading text-fg transition-colors hover:text-accent"
                  >
                    {tNav(row.labelKey)}
                    <span
                      aria-hidden="true"
                      className="font-mono text-body font-normal text-fg-tertiary transition-[translate,color] duration-200 group-hover:translate-x-1 group-hover:text-accent"
                    >
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </Reveal>
          </section>
        )}

        <Colophon className="mt-24" />
      </div>
    </main>
  );
}
