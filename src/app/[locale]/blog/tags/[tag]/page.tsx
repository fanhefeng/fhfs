import { SnapshotNotice } from "@/components/blog/SnapshotNotice";
import { notFound } from "@/lib/navigation";

import { Link } from "@/i18n/navigation";

import { YearIndex } from "@/components/blog/PostCard";
import { Reveal } from "@/components/fx/Reveal";
import { useTranslations } from "use-intl";

export default function TagPage({
  data,
}: {
  data: Awaited<ReturnType<typeof import("./page.server").loadPageData>>;
}) {
  const { locale, tag, posts } = data;
  const t = useTranslations("blog");
  if (posts.length === 0) notFound();
  return (
    <main id="main" className="mx-auto w-full max-w-[720px] flex-1 px-6 pb-28 pt-32 md:pt-40">
      <SnapshotNotice locale={locale} snapshotAt={posts[0]?.snapshotAt} />
      <Reveal as="section" className="mb-12">
        <p className="mb-4 font-mono text-meta uppercase tracking-meta text-fg-tertiary">
          {t("tags")}
        </p>
        <h1 className="text-display-sm">{t("taggedWith", { tag })}</h1>
        <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-meta uppercase tracking-meta text-fg-tertiary">
          <span>{t("filterSummary", { count: posts.length })}</span>
          <span aria-hidden>·</span>
          <Link
            href="/blog"
            className="hit-ext relative text-accent underline decoration-transparent underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-current"
          >
            {t("clearFilter")}
          </Link>
        </p>
      </Reveal>

      <YearIndex posts={posts} yearAria={(year) => t("yearAria", { year })} />
    </main>
  );
}
