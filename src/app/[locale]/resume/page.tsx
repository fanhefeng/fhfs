/* oxlint-disable jsx-a11y/no-redundant-roles -- WebKit needs explicit list roles when Tailwind removes markers. */
import { Link } from "@/i18n/navigation";
import { site } from "@/config/site";

import { JsonLd } from "@/components/seo/JsonLd";
import { Reveal } from "@/components/fx/Reveal";
import { PrintButton } from "@/components/resume/PrintButton";
import { Rich } from "@/components/resume/Rich";
import { Bullets, ResumeSection } from "@/components/resume/ResumeSection";
import { MailLink } from "@/components/ui/MailLink";
import { useTranslations, useFormatter } from "use-intl";
const metaLabel = "text-caption text-fg-tertiary";
const contactLink =
  "inline-flex min-h-11 max-w-full flex-wrap items-baseline gap-x-2 py-2 underline decoration-line underline-offset-4 transition-colors hover:text-accent hover:decoration-accent focus-visible:decoration-accent print:min-h-0 print:py-0";
export default function ResumePage({
  data,
}: {
  data: Awaited<ReturnType<typeof import("./page.server").loadPageData>>;
}) {
  const { locale, profile, experiences } = data;
  const t = useTranslations("resume");
  const format = useFormatter();
  if (!profile) {
    return (
      <main id="main" className="mx-auto w-full max-w-[800px] flex-1 px-6 pb-24 pt-24 sm:pt-32">
        {/* The way back out belongs here too — an unsaved résumé is the one
            state where there is nothing else on the page to leave by. */}
        <Link
          href="/about"
          className={`${metaLabel} hit-ext inline-flex min-h-11 items-center underline decoration-line underline-offset-4 hover:text-accent`}
        >
          {t("backToAbout")}
        </Link>
        <h1 className="mt-8 text-display-sm text-fg">{t("title")}</h1>
        <p className="mt-6 text-body text-fg-secondary">{t("empty")}</p>
      </main>
    );
  }
  const updated = format.dateTime(new Date(profile.updatedAt), {
    year: "numeric",
    month: "long",
  });
  const sections = profile.sections[locale];
  const intro = profile.intro[locale];
  const highlights = profile.highlights[locale];
  const skills = profile.skills[locale];
  const projects = profile.projects[locale];
  const education = profile.education[locale];
  return (
    <main
      id="main"
      data-resume
      className="mx-auto w-full max-w-[800px] flex-1 px-6 pb-24 pt-24 [overflow-wrap:anywhere] sm:pt-32 print:max-w-none print:px-0 print:pb-0 print:pt-0"
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: profile.name[locale],
          jobTitle: profile.tagline[locale],
          url: `${site.url}/${locale}/resume`,
          sameAs: profile.github ? [`https://github.com/${profile.github}`] : [site.social.github],
        }}
      />

      <Reveal as="section">
        <header>
          {/* 简历 is a page of 关于, not a door of its own — so it says where
              it sits and leads back there. Off the printed sheet: paper has
              no back. */}
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 print:hidden">
            <Link
              href="/about"
              className={`${metaLabel} inline-flex min-h-11 items-center underline decoration-line underline-offset-4 hover:text-accent`}
            >
              {t("backToAbout")}
            </Link>
            <PrintButton label={t("print")} ariaLabel={t("printAria")} />
          </div>

          <h1 className="mt-10 flex flex-wrap items-baseline gap-x-4 gap-y-2 text-display-sm text-fg print:mt-0">
            <span>{profile.name[locale]}</span>
            <span className="text-caption font-medium tracking-normal text-fg-tertiary">
              {t("title")}
            </span>
          </h1>
          <p className="mt-3 text-heading font-medium text-fg-secondary">
            {profile.tagline[locale]}
          </p>

          <ul
            role="list"
            className="mt-5 flex flex-wrap gap-x-6 text-caption text-fg-secondary print:gap-y-1"
          >
            {profile.location?.[locale] && (
              <li className="inline-flex min-h-11 items-baseline gap-x-2 py-2 print:min-h-0 print:py-0">
                <span className={metaLabel}>{t("locationLabel")}</span>
                <span>{profile.location[locale]}</span>
              </li>
            )}
            {profile.github && (
              <li>
                <a
                  href={`https://github.com/${profile.github}`}
                  target="_blank"
                  rel="noreferrer"
                  className={contactLink}
                >
                  <span className={metaLabel}>{t("githubLabel")}</span>
                  <span>{profile.github}</span>
                </a>
              </li>
            )}
            {profile.website && (
              <li>
                <a href={profile.website} target="_blank" rel="noreferrer" className={contactLink}>
                  <span className={metaLabel}>{t("linksLabel")}</span>
                  {/* Shown without its scheme — the label already says what it is. */}
                  <span>{profile.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                </a>
              </li>
            )}
            {profile.email && (
              <li>
                <MailLink email={profile.email} className={contactLink}>
                  <span className={metaLabel}>{t("emailLabel")}</span>
                  <span>{profile.email}</span>
                </MailLink>
              </li>
            )}
          </ul>
          {profile.note?.[locale] && (
            <p className="mt-4 text-caption text-fg-secondary">{profile.note[locale]}</p>
          )}
        </header>
      </Reveal>

      {(intro.length > 0 || highlights.length > 0) && (
        <ResumeSection title={t("summaryTitle")}>
          {intro.length > 0 && (
            <div className="space-y-4 text-body text-fg-secondary print:space-y-2">
              {intro.map((paragraph, i) => (
                <p key={i}>
                  <Rich text={paragraph} />
                </p>
              ))}
            </div>
          )}
          <Bullets items={highlights} className={intro.length > 0 ? "mt-6" : ""} />
        </ResumeSection>
      )}

      {skills.length > 0 && (
        <ResumeSection title={t("skillsTitle")}>
          <dl className="grid gap-x-10 gap-y-6 sm:grid-cols-2 print:gap-y-3">
            {skills.map((group, i) => (
              <div
                key={i}
                className={`min-w-0 print:break-inside-avoid${group.name ? "" : " sm:col-span-2"}`}
              >
                {group.name && <dt className="text-caption font-semibold text-fg">{group.name}</dt>}
                <dd className={`text-body text-fg-secondary${group.name ? " mt-1.5" : ""}`}>
                  <Rich text={group.items} />
                </dd>
              </div>
            ))}
          </dl>
        </ResumeSection>
      )}

      {/* The free sections — "what I have built" — each under a heading of
          its own, in the author's words rather than a fixed slot. After the
          stack and before the road: what I work with, what came of it,
          where. */}
      {sections.map((section, i) => (
        <ResumeSection key={i} title={section.title}>
          <div className="space-y-4 text-body text-fg-secondary print:space-y-2">
            {section.bullets.map((paragraph, j) => (
              <p key={j}>
                <Rich text={paragraph} />
              </p>
            ))}
          </div>
        </ResumeSection>
      ))}

      {experiences.length > 0 && (
        <ResumeSection title={t("experienceTitle")}>
          {/* Rows with no bullets and no projects are a bare list — where,
              when, doing what — and sit close; rows with content keep their
              room. */}
          <div
            className={
              experiences.every(
                (e) => e.bullets[locale].length === 0 && e.projects[locale].length === 0,
              )
                ? "space-y-5 print:space-y-2"
                : "space-y-12 print:space-y-5"
            }
          >
            {experiences.map((experience) => (
              <article key={experience.key}>
                <div className="print:break-inside-avoid">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                    <h3 className="text-heading text-fg">
                      {experience.url ? (
                        <a
                          href={experience.url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-accent"
                        >
                          {experience.company[locale]}
                        </a>
                      ) : (
                        experience.company[locale]
                      )}
                    </h3>
                    <span className="font-mono text-meta text-fg-tertiary tabular-nums">
                      {experience.period[locale]}
                    </span>
                  </div>
                  {experience.role[locale] && (
                    <p className="mt-1 text-caption font-medium text-fg-secondary">
                      {experience.role[locale]}
                    </p>
                  )}
                  {experience.summary?.[locale] && (
                    <p className="mt-1.5 text-caption text-fg-tertiary">
                      {experience.summary[locale]}
                    </p>
                  )}
                </div>

                <Bullets items={experience.bullets[locale]} className="mt-4" />

                {experience.projects[locale].map((project, i) => (
                  <div key={i} className="mt-6 print:mt-3 print:break-inside-avoid">
                    <h4 className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-body font-semibold text-fg">
                      <span>{project.title}</span>
                      {project.period && (
                        <span className="font-mono text-meta font-normal text-fg-tertiary tabular-nums">
                          {project.period}
                        </span>
                      )}
                    </h4>
                    <Bullets items={project.bullets} className="mt-3" />
                  </div>
                ))}
              </article>
            ))}
          </div>
        </ResumeSection>
      )}

      {projects.length > 0 && (
        <ResumeSection title={t("projectsTitle")}>
          <Bullets items={projects} />
        </ResumeSection>
      )}

      {education.length > 0 && (
        <ResumeSection title={t("educationTitle")}>
          <ul role="list" className="space-y-2 text-body text-fg-secondary">
            {education.map((line, i) => (
              <li key={i}>
                <Rich text={line} />
              </li>
            ))}
          </ul>
        </ResumeSection>
      )}

      {/* On paper the colophon stays with whatever precedes it — a sheet
          carrying one line of mono is a sheet nobody wanted. */}
      <footer className="mt-16 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-line pt-6 print:mt-4 print:break-before-avoid print:pt-2">
        <p className={metaLabel}>{t("updated", { date: updated })}</p>
        <Link
          href="/intro"
          className={`${metaLabel} inline-flex min-h-11 items-center underline decoration-line underline-offset-4 hover:text-accent print:hidden`}
        >
          {t("introLink")}
        </Link>
      </footer>
    </main>
  );
}
