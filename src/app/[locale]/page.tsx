import { SnapshotNotice } from "@/components/blog/SnapshotNotice";
import { htmlLang } from "@/i18n/routing";

import { JsonLd } from "@/components/seo/JsonLd";
import { site } from "@/config/site";

import { type Release } from "@/lib/server/github";
import { appGithubRepo } from "@/lib/githubData";
import { newestSaid, stampInZone } from "@/lib/moments";
import { newestLabEntry } from "@/components/lab/entries";
import { Chibi } from "@/components/chibi/Chibi";
import { Opening, type OpeningMeta, type ContactLink } from "@/components/home/Opening";
import { NeonSplash } from "@/components/home/NeonSplash";
import { RecentWriting, type WritingItem } from "@/components/home/RecentWriting";
import { NowStrip, type NowItem } from "@/components/home/NowStrip";
import { useTranslations } from "use-intl";
const POST_COUNT = 4;
export default function HomePage({
  data,
}: {
  data: Awaited<ReturnType<typeof import("./page.server").loadPageData>>;
}) {
  const { locale, allPosts, allApps, moments, releases } = data;
  const t = useTranslations("home");
  const th = useTranslations("grove");
  const td = useTranslations("splash");
  const tn = useTranslations("nav");
  const tNote = useTranslations("notebook");
  const tl = useTranslations("lab");
  const posts: WritingItem[] = allPosts.slice(0, POST_COUNT).map((post) => ({
    slug: post.slug,
    title: post.title,
    lang: post.isFallback ? htmlLang(post.locale) : undefined,
    date: post.date?.replaceAll("-", ".") ?? tNote("undated"),
    readingTime: t("readingTime", { minutes: post.readingMinutes }),
  }));
  const said = newestSaid(moments);
  const study = newestLabEntry();
  let latest: { name: string; release: Release } | undefined;
  for (const app of allApps) {
    const release = releases.get(appGithubRepo(app) ?? "");
    if (!release?.publishedAt) continue;
    if (!latest || release.publishedAt > latest.release.publishedAt!) {
      latest = { name: app.name, release };
    }
  }
  const now: NowItem[] = [
    ...(said
      ? [
          {
            label: tn("moments"),
            title: said.content,
            // The board is written in Chinese only.
            lang: locale === "zh" ? undefined : htmlLang("zh"),
            stamp: stampInZone(said.postedAt, site.timeZone).time,
            href: "/moments",
          },
        ]
      : []),
    {
      label: tn("lab"),
      title: tl(`items.${study.key}.name`),
      stamp: study.added.replaceAll("-", "."),
      href: `/lab/${study.slug}`,
    },
    ...(latest
      ? [
          {
            label: tn("software"),
            title: `${latest.name} ${latest.release.version}`,
            stamp: stampInZone(latest.release.publishedAt!, site.timeZone).time.slice(0, 10),
            href: latest.release.url,
            external: true,
          },
        ]
      : []),
  ];
  const contacts: ContactLink[] = [
    { label: "GitHub", href: site.social.github, external: true },
    { label: "RSS", href: `/${locale}/rss.xml` },
    ...(site.social.email ? [{ label: "Email", email: site.social.email }] : []),
  ];
  const meta: OpeningMeta[] = [{ label: th("metaPlaceLabel"), value: th("metaPlace") }];
  return (
    <>
      {/* The front door, once per session on a hard landing: the neon over
          the door of fhf's, and the way in through its ring. A sibling of
          <main>, not a child — RouteTransition scales <main> on a reveal,
          and a transformed ancestor would pin this fixed wall to it. */}
      <NeonSplash
        label={td("label")}
        welcome={td("welcome")}
        sign={td("sign")}
        enter={td("enter")}
        enterHint={td("enterHint")}
      />
      <main id="main" className="flex-1">
        {allPosts[0]?.snapshotAt && (
          <div className="mx-auto max-w-[720px] px-6 pt-24">
            <SnapshotNotice locale={locale} snapshotAt={allPosts[0]?.snapshotAt} />
          </div>
        )}
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Person",
            name: site.author,
            url: site.url,
            sameAs: [site.social.github],
            ...(site.social.email ? { email: site.social.email } : {}),
          }}
        />

        <Opening
          headline={[th("headline1"), th("headline2")]}
          lede={th("lede")}
          // The one primary control goes to /software (DESIGN-LOG, 10-03) —
          // back from the lab, where it spent a week. The issue below used to
          // open with the same six apps as cards; with the button pointing at
          // them that section said it twice, and it is gone.
          cta={{ label: th("cta"), href: `/${locale}/software` }}
          meta={meta}
          contactTitle={t("contactTitle")}
          contacts={contacts}
          aboutLink={{ label: t("aboutLink") }}
          avatar={<Chibi label={t("chibiAria")} hint={t("chibiHint")} />}
        />

        {/* The issue itself, at the site's 720px reading measure. */}
        <div
          id="issue"
          className="mx-auto flex w-full max-w-[720px] scroll-mt-24 flex-col gap-20 px-6 pt-8 pb-24 md:gap-24 md:pt-12 md:pb-32"
        >
          <RecentWriting
            items={posts}
            title={t("latestPosts")}
            viewAllLabel={t("viewAllPosts")}
            index="01"
          />
          <NowStrip items={now} title={t("nowTitle")} index="02" />
        </div>
      </main>
    </>
  );
}
