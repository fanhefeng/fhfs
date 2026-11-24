import { SnapshotNotice } from "@/components/blog/SnapshotNotice";
import { ArticleShare, useArticleShare } from "@/components/blog/ArticleShare";
import { htmlLang } from "@/i18n/routing";

import { Link } from "@/i18n/navigation";

import { ArticleNeighbours, ArticleSummary, FallbackNotice } from "@/components/blog/ArticleParts";
import { Mdx } from "@/components/blog/Mdx";
import { ArticleContents, ImportedNoteDetails } from "@/components/blog/ImportedNoteDetails";
import { PostTitle } from "@/components/blog/PostTitle";
import { TagPill } from "@/components/blog/TagPill";
import { RadialFab } from "@/components/fx/RadialFab";

import { JsonLd } from "@/components/seo/JsonLd";
import { site } from "@/config/site";
import { useTranslations, useFormatter } from "use-intl";
const SCRIM_LAYERS = [
  { blur: "backdrop-blur-[1px]", from: 0, to: 17 },
  { blur: "backdrop-blur-[2px]", from: 17, to: 34 },
  { blur: "backdrop-blur-[4px]", from: 34, to: 51 },
  { blur: "backdrop-blur-[8px]", from: 51, to: 68 },
  { blur: "backdrop-blur-[16px]", from: 68, to: 85 },
];
function TopScrim() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-20 md:h-24 print:hidden"
    >
      {SCRIM_LAYERS.map((layer) => {
        const mask = `linear-gradient(to top, transparent ${layer.from}%, black ${layer.to}%, black 100%)`;
        return (
          <div
            key={layer.blur}
            className={`absolute inset-0 ${layer.blur} reduced-transparency:backdrop-blur-none`}
            style={{ maskImage: mask, WebkitMaskImage: mask }}
          />
        );
      })}
    </div>
  );
}
type PostPageData = Awaited<ReturnType<typeof import("./page.server").loadPageData>>;

export default function PostPage({ data }: { data: PostPageData }) {
  const { shareTarget } = data;
  const variant = !shareTarget ? "none" : shareTarget.title === undefined ? "link" : "rich";
  return (
    <PostContent
      key={`${data.locale}:${data.slug}:${variant}:${shareTarget?.url ?? ""}`}
      data={data}
    />
  );
}

function PostContent({ data }: { data: PostPageData }) {
  const { locale, post, older, newer, shareTarget } = data;
  const share = useArticleShare(shareTarget);
  const t = useTranslations("blog");
  const tn = useTranslations("notebook");
  const format = useFormatter();
  const minutes = post.readingMinutes;
  return (
    <>
      <TopScrim />
      <main id="main" className="mx-auto w-full max-w-[68ch] flex-1 px-6 pb-28 pt-32 md:pt-40">
        <SnapshotNotice locale={locale} snapshotAt={post.snapshotAt} />
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.summary,
            ...(post.date ? { datePublished: post.date } : {}),
            author: { "@type": "Person", name: site.author },
            // The same URL `generateMetadata` calls canonical: on a fallback
            // render this prefix is not where the text lives, and two URLs each
            // claiming to be the article is the thing hreflang exists to avoid.
            url: `${site.url}/${post.locale}/blog/${post.slug}`,
          }}
        />
        {/* A fallback article is the other language's text under this
            locale's <html lang>: the article says so itself, for screen
            readers' pronunciation and for the crawler's language detection.
            The notice inside stays in the page's own language, hence its own
            lang below. */}
        <article
          lang={post.isFallback || post.note ? htmlLang(post.locale) : undefined}
          className="min-w-0 [overflow-wrap:anywhere]"
        >
          <header className="mb-12">
            {/* The line's own words are this locale's, even on a fallback
                render — but the tags are the author's, in whatever language
                they were written, so the override stops before them. */}
            <p className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-meta uppercase tracking-meta text-fg-tertiary">
              {/* Where this page hangs, and the way back up — the other rooms'
                  detail pages all open with it; this one only had the link at
                  the very bottom, a whole article away. */}
              <Link
                href="/blog"
                lang={post.isFallback ? htmlLang(locale) : undefined}
                className="hit-ext transition-colors hover:text-accent"
              >
                {t("title")}
              </Link>
              <span aria-hidden>·</span>
              {post.date ? (
                <time dateTime={post.date} lang={post.isFallback ? htmlLang(locale) : undefined}>
                  {format.dateTime(new Date(post.date), {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              ) : (
                <span>{tn("undated")}</span>
              )}
              <span aria-hidden>·</span>
              <span lang={post.isFallback ? htmlLang(locale) : undefined}>
                {t("readingTime", { minutes })}
              </span>
              {post.format && <span className="text-accent">{tn(`formats.${post.format}`)}</span>}
              {post.tags.map((tag) => (
                <TagPill key={tag} tag={tag} />
              ))}
            </p>

            <PostTitle title={post.title} className="text-title md:text-display-sm" />

            {post.summary && (
              <ArticleSummary lang={post.note ? htmlLang(locale) : undefined}>
                {post.summary}
              </ArticleSummary>
            )}
            <ArticleShare share={share} />
          </header>

          {post.isFallback && (
            <FallbackNotice locale={locale}>{t("fallbackNotice")}</FallbackNotice>
          )}

          {post.note && (
            <ImportedNoteDetails note={post.note} locale={locale} textLocale={post.locale} />
          )}
          {post.toc && <ArticleContents toc={post.toc} locale={locale} textLocale={post.locale} />}
          <Mdx html={post.html} />
        </article>

        <ArticleNeighbours
          base="/blog"
          locale={locale}
          older={older}
          newer={newer}
          label={t("postNavAria")}
          prev={t("prevPost")}
          next={t("nextPost")}
        />

        <p className="mt-14">
          <Link
            href="/blog"
            className="hit-ext relative font-mono text-meta uppercase tracking-meta text-fg-secondary underline decoration-line underline-offset-4 transition-colors duration-200 hover:text-accent"
          >
            {t("backToList")}
          </Link>
        </p>
      </main>
      <RadialFab
        articleShare={
          share && {
            run: share.run,
            busy: share.status === "busy",
            copied: share.status === "copied",
          }
        }
      />
    </>
  );
}
