import { SnapshotNotice } from "@/components/blog/SnapshotNotice";
import { YearIndex } from "@/components/blog/PostCard";
import { TagPill } from "@/components/blog/TagPill";
import { Reveal } from "@/components/fx/Reveal";
import { ScrollTrigger } from "@/lib/client/gsap";
import { useTranslations } from "use-intl";

export default function BlogPage({
  data,
}: {
  data: Awaited<ReturnType<typeof import("./page.server").loadPageData>>;
}) {
  const { locale, posts, tags } = data;
  const t = useTranslations("blog");
  return (
    <main id="main" className="mx-auto w-full max-w-[720px] flex-1 px-6 pb-28 pt-32 md:pt-40">
      <SnapshotNotice locale={locale} snapshotAt={posts[0]?.snapshotAt} />
      <Reveal as="header" className="mb-10">
        <h1 className="text-display-sm">{t("title")}</h1>
        <p className="mt-3 max-w-[46ch] text-body text-fg-secondary">{t("subtitle")}</p>
        {tags.length > 0 && (
          <details className="group/tags mt-3" onToggle={() => ScrollTrigger.refresh()}>
            <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center text-small text-fg-secondary underline decoration-line underline-offset-4 hover:text-accent focus-visible:text-accent [&::-webkit-details-marker]:hidden">
              <span className="group-open/tags:hidden">{t("browseTags")}</span>
              <span className="hidden group-open/tags:inline">{t("hideTags")}</span>
            </summary>
            <nav
              aria-label={t("tags")}
              className="mt-2 flex flex-wrap gap-x-5 border-t border-line"
            >
              {tags.map(({ tag }) => (
                <TagPill key={tag} tag={tag} className="flex min-h-11 items-center" />
              ))}
            </nav>
          </details>
        )}
      </Reveal>

      {posts.length === 0 ? (
        <p className="text-body text-fg-secondary">{t("empty")}</p>
      ) : (
        <YearIndex posts={posts} yearAria={(year) => t("yearAria", { year })} />
      )}
    </main>
  );
}
