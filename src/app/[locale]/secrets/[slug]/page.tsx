import { htmlLang } from "@/i18n/routing";

import { Link } from "@/i18n/navigation";

import { ArticleNeighbours, ArticleSummary, FallbackNotice } from "@/components/blog/ArticleParts";
import { Mdx } from "@/components/blog/Mdx";
import { PostTitle } from "@/components/blog/PostTitle";
import { RoomMusic } from "@/components/fx/RoomMusic";

import { JsonLd } from "@/components/seo/JsonLd";
import { site } from "@/config/site";
import { asset } from "@/lib/asset";
import { useTranslations, useFormatter } from "use-intl";

export default function SecretPage({
  data,
}: {
  data: Awaited<ReturnType<typeof import("./page.server").loadPageData>>;
}) {
  const { locale, secret, older, newer } = data;
  const t = useTranslations("secrets");
  const tt = useTranslations("tracks.secret");
  const tc = useTranslations("common");
  const format = useFormatter();
  const isPodcast = secret.kind === "podcast";
  const audio = secret.audio ? asset(secret.audio) : null;
  return (
    <main id="main" className="mx-auto w-full max-w-[68ch] flex-1 px-6 pb-28 pt-32 md:pt-40">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": isPodcast ? "PodcastEpisode" : "BlogPosting",
          headline: secret.title,
          name: secret.title,
          description: secret.summary,
          datePublished: secret.date,
          author: { "@type": "Person", name: site.author },
          // The same URL `generateMetadata` calls canonical: on a fallback
          // render this prefix is not where the text lives, and two URLs each
          // claiming to be the article is the thing hreflang exists to avoid.
          url: `${site.url}/${secret.locale}/secrets/${secret.slug}`,
          // schema.org wants the file's full URL, not a path on this site.
          ...(isPodcast && audio
            ? {
                associatedMedia: {
                  "@type": "MediaObject",
                  contentUrl: audio.startsWith("/") ? `${site.url}${audio}` : audio,
                },
              }
            : {}),
        }}
      />
      <article lang={secret.isFallback ? htmlLang(secret.locale) : undefined}>
        <header className="mb-12">
          <p
            lang={secret.isFallback ? htmlLang(locale) : undefined}
            className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-meta uppercase tracking-meta text-fg-tertiary"
          >
            <Link href="/secrets" className="hit-ext transition-colors hover:text-accent">
              {t("title")}
            </Link>
            <span aria-hidden>·</span>
            <span className="text-accent">{t(isPodcast ? "kindPodcast" : "kindEssay")}</span>
            <span aria-hidden>·</span>
            <time dateTime={secret.date}>
              {format.dateTime(new Date(secret.date), {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            {isPodcast ? (
              secret.duration != null && (
                <>
                  <span aria-hidden>·</span>
                  <span>{t("duration", { minutes: secret.duration })}</span>
                </>
              )
            ) : (
              <>
                <span aria-hidden>·</span>
                <span>{t("readingTime", { minutes: secret.readingMinutes })}</span>
              </>
            )}
          </p>

          <PostTitle title={secret.title} className="text-title md:text-display-sm" />

          {secret.summary && <ArticleSummary>{secret.summary}</ArticleSummary>}

          {!isPodcast && (
            <RoomMusic
              track="secret"
              tonight={tc("tonight")}
              title={tt("title")}
              artist={tt("artist")}
              className="mt-6"
            />
          )}
        </header>

        {secret.isFallback && (
          <FallbackNotice locale={locale}>{t("fallbackNotice")}</FallbackNotice>
        )}

        {isPodcast && audio && (
          <figure className="mb-10 rounded-card border border-line bg-surface p-4">
            <figcaption className="mb-3 font-mono text-meta uppercase tracking-meta text-fg-tertiary">
              {t("listen")}
            </figcaption>
            {/* The browser's own player: nothing to load, nothing to keep
                honest, and it works with the page's JavaScript off. An
                episode's text alternative is its notes, rendered right under
                it — there is no caption track to point a <track> at. */}
            {/* oxlint-disable-next-line jsx-a11y/media-has-caption */}
            <audio controls preload="none" src={audio} className="w-full">
              {t("audioUnsupported")}
              <a href={audio} className="text-accent underline">
                {t("audioOpen")}
              </a>
            </audio>
          </figure>
        )}

        {secret.html && <Mdx html={secret.html} />}
      </article>

      <ArticleNeighbours
        base="/secrets"
        locale={locale}
        older={older}
        newer={newer}
        label={t("postNavAria")}
        prev={t("prevPost")}
        next={t("nextPost")}
      />

      <p className="mt-14">
        <Link
          href="/secrets"
          className="hit-ext relative font-mono text-meta uppercase tracking-meta text-fg-secondary underline decoration-line underline-offset-4 transition-colors duration-200 hover:text-accent"
        >
          {t("backToList")}
        </Link>
      </p>
    </main>
  );
}
