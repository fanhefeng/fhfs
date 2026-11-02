import type { CSSProperties } from "react";
import Image from "@/components/ui/Image";

import { Link } from "@/i18n/navigation";
import { asset } from "@/lib/asset";
import { coverOf } from "@/lib/films";
import { inLocale } from "@/lib/localized";

import { Reveal } from "@/components/fx/Reveal";
import { roomMeta } from "@/components/life/rooms";
import { useTranslations } from "use-intl";
type SubLink = { href: string; label: string };
const ROW_CSS = `
.life-row::before {
  content: "";
  position: absolute;
  left: -1rem;
  top: 1.5rem;
  bottom: 1.5rem;
  width: 2px;
  border-radius: 2px;
  background: var(--row-accent);
  opacity: 0;
  transition: opacity 0.25s ease-out;
}
.life-row:hover::before,
.life-row:focus-within::before { opacity: 0.75; }
`;
export default function LifePage({
  data,
}: {
  data: Awaited<ReturnType<typeof import("./page.server").loadPageData>>;
}) {
  const { locale, rooms, moments, secrets, idols, films } = data;
  const t = useTranslations("life");
  const tNav = useTranslations("nav");
  const tTracks = useTranslations("tracks");
  const firstCard = (picture: { src: string; width: number; height: number } | undefined) =>
    picture && { src: asset(picture.src), width: picture.width, height: picture.height };
  const furniture = roomMeta(
    idols[0] && {
      cover: firstCard(coverOf(idols[0].photos, idols[0].cover)),
      accent: idols[0].accent,
    },
    films[0] && {
      cover: firstCard(coverOf(films[0].stills, films[0].cover)),
      accent: films[0].accent,
    },
  );
  const stat = (href: string): string | null => {
    switch (href) {
      case "/moments":
        return t("countEntries", { count: moments.length });
      case "/secrets":
        return secrets.length ? t("countPieces", { count: secrets.length }) : t("empty");
      case "/idols":
        return t("countIdols", { count: idols.length });
      case "/films":
        return t("countFilms", { count: films.length });
      default:
        return null;
    }
  };
  const subs = (href: string): SubLink[] => {
    switch (href) {
      case "/idols":
        return idols.map((idol) => ({
          href: `/idols/${idol.key}`,
          label: inLocale(idol.name, locale),
        }));
      case "/films":
        return films.map((film) => ({
          href: `/films/${film.key}`,
          label: inLocale(film.title, locale),
        }));
      default:
        return [];
    }
  };
  return (
    <main id="main" className="mx-auto w-full max-w-[720px] flex-1 px-6 pb-28 pt-32 md:pt-40">
      <Reveal as="header" className="mb-12">
        <p className="font-mono text-meta uppercase tracking-meta text-fg-tertiary">
          {t("kicker")}
        </p>
        <h1 className="mt-3 text-display-sm">{t("title")}</h1>
        <p className="mt-4 max-w-[46ch] text-body text-fg-secondary">{t("subtitle")}</p>
      </Reveal>

      {rooms.length === 0 ? (
        <p className="text-body text-fg-secondary">{t("none")}</p>
      ) : (
        <Reveal as="ol" role="list" stagger={0.06} className="border-t border-line">
          {rooms.map((room, i) => {
            const meta = furniture[room.href];
            const key = meta?.key ?? room.labelKey;
            const title = t.has(`items.${key}.title`)
              ? t(`items.${key}.title`)
              : tNav(room.labelKey);
            const line = t.has(`items.${key}.line`) ? t(`items.${key}.line`) : null;
            const count = stat(room.href);
            const record = meta?.track
              ? t("record", { title: tTracks(`${meta.track}.title`) })
              : null;
            const links = subs(room.href);
            return (
              <li
                key={room.href}
                className="life-row relative grid grid-cols-[auto_1fr] gap-x-4 border-b border-line py-6 sm:grid-cols-[auto_1fr_auto] sm:gap-x-6"
                style={{ "--row-accent": meta?.accent ?? "var(--accent)" } as CSSProperties}
              >
                <span
                  className="pt-1 font-mono text-[0.6875rem] tracking-[0.08em] text-fg-tertiary"
                  aria-hidden="true"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <Link
                    href={room.href}
                    className="hit-ext text-heading text-fg transition-colors hover:text-accent"
                  >
                    {title}
                  </Link>
                  {line && (
                    <p className="mt-1.5 max-w-[52ch] text-caption text-fg-secondary">{line}</p>
                  )}
                  {(count || record) && (
                    <p className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-meta uppercase tracking-meta text-fg-tertiary">
                      {count && <span className="tabular-nums">{count}</span>}
                      {record && <span>{record}</span>}
                    </p>
                  )}
                  {links.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      {links.map((link) => (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            className="hit-ext inline-flex min-h-9 items-center text-caption text-fg-secondary underline decoration-line underline-offset-4 transition-colors hover:text-accent"
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {meta?.cover && (
                  <Link
                    href={room.href}
                    tabIndex={-1}
                    aria-hidden="true"
                    className="hidden sm:block"
                  >
                    <Image
                      src={meta.cover.src}
                      width={meta.cover.width}
                      height={meta.cover.height}
                      alt=""
                      sizes="96px"
                      className="size-24 rounded-card bg-surface object-cover object-top"
                    />
                  </Link>
                )}
              </li>
            );
          })}
        </Reveal>
      )}

      <style href="life-index" precedence="medium">
        {ROW_CSS}
      </style>
    </main>
  );
}
