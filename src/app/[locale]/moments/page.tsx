import { site } from "@/config/site";
import { asset } from "@/lib/asset";

import { momentCalendar, stampInZone, type BoardMoment, type MomentMedia } from "@/lib/moments";

import { Reveal } from "@/components/fx/Reveal";
import { RadialFab } from "@/components/fx/RadialFab";
import { RoomMusic } from "@/components/fx/RoomMusic";
import { MomentBoard } from "@/components/moments/MomentBoard";
import { MomentCalendar } from "@/components/moments/MomentCalendar";
import { useTranslations } from "use-intl";
const resolveMedia = (item: MomentMedia): MomentMedia =>
  item.kind === "video"
    ? { ...item, src: asset(item.src), poster: asset(item.poster) }
    : { ...item, src: asset(item.src) };
export default function MomentsPage({
  data,
}: {
  data: Awaited<ReturnType<typeof import("./page.server").loadPageData>>;
}) {
  const { rows } = data;
  const t = useTranslations("moments");
  const tt = useTranslations("tracks.lovely");
  const tc = useTranslations("common");
  const items: BoardMoment[] = rows.map((row) => ({
    key: row.key,
    content: row.content,
    media: row.media.map(resolveMedia),
    // Year and hour in the site's zone — the one the lines were written in.
    ...stampInZone(row.postedAt, site.timeZone),
    dateTime: row.postedAt,
    collection: row.collection,
    original: row.original,
    attribution: row.attribution,
    pinned: row.pinned,
  }));
  const langNotice = t("langNotice");
  return (
    <>
      <main id="main" className="mx-auto w-full max-w-[720px] flex-1 px-6 pb-28 pt-32 md:pt-40">
        <Reveal as="section" className="mb-10">
          <p className="font-mono text-meta uppercase tracking-meta text-fg-tertiary">
            {t("kicker")}
          </p>
          <h1 className="mt-3 text-display-sm">{t("title")}</h1>
          {/* The subtitle is the page's description for search and sharing
            only (DESIGN-LOG, 10-03): the paragraph on where the name came
            from is gone from the page. */}
          {langNotice && (
            <p className="mt-4 max-w-[46ch] text-caption text-fg-tertiary">{langNotice}</p>
          )}
          {items.length > 0 && (
            <p className="mt-5 font-mono text-meta uppercase tracking-meta text-fg-tertiary">
              {t("count", { count: items.length })}
            </p>
          )}
          <RoomMusic
            track="lovely"
            tonight={tc("tonight")}
            title={tt("title")}
            artist={tt("artist")}
            className="mt-6"
          />
        </Reveal>

        {items.length === 0 ? (
          <p className="text-body text-fg-secondary">{t("empty")}</p>
        ) : (
          <>
            <MomentCalendar years={momentCalendar(rows, site.timeZone)} />
            <MomentBoard items={items} />
          </>
        )}
      </main>
      {/* The longest page on the site, with its filter at the very top: on a
        phone the article pages' quick actions — back to top among them — are
        the way back up. (Desktop has the island; see RadialFab.) */}
      <RadialFab shareTitle={t("title")} feed={false} />
    </>
  );
}
