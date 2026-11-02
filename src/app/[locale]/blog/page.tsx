import { YearIndex } from "@/components/blog/PostCard";
import { TagPill } from "@/components/blog/TagPill";
import { Reveal } from "@/components/fx/Reveal";
import { useTranslations } from "use-intl";
import { Link } from "@/i18n/navigation";

export default function BlogPage({
  data,
}: {
  data: Awaited<ReturnType<typeof import("./page.server").loadPageData>>;
}) {
  const { posts, tags } = data;
  const t = useTranslations("blog");
  return (
    <main id="main" className="mx-auto w-full max-w-[720px] flex-1 px-6 pb-28 pt-32 md:pt-40">
      <Reveal as="section" className="mb-12">
        <h1 className="text-display-sm">{t("title")}</h1>
        <p className="mt-4 max-w-[46ch] text-body text-fg-secondary">{t("subtitle")}</p>
        {posts.length > 0 && (
          <p className="mt-5 font-mono text-meta uppercase tracking-meta text-fg-tertiary">
            {t("filterSummary", { count: posts.length })}
          </p>
        )}
      </Reveal>

      <Link
        href="/blog/notes"
        className="group mb-12 flex items-center justify-between gap-6 border-y border-line py-6"
      >
        <span>
          <span className="font-mono text-meta uppercase tracking-meta text-accent">
            {t("notebookTitle")}
          </span>
          <span className="mt-2 block text-small leading-relaxed text-fg-secondary">
            {t("notebookDescription")}
          </span>
        </span>
        <span
          aria-hidden
          className="text-fg-tertiary transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
        >
          ↗
        </span>
      </Link>

      {tags.length > 0 && (
        <Reveal
          as="div"
          stagger={0.04}
          className="mb-16 flex flex-wrap items-center gap-x-3 gap-y-4"
        >
          {tags.map(({ tag, count }, i) => (
            <TagPill key={tag} tag={tag} count={count} variant="sticker" seed={i} />
          ))}
        </Reveal>
      )}

      {posts.length === 0 ? (
        <p className="text-body text-fg-secondary">{t("empty")}</p>
      ) : (
        <YearIndex posts={posts} yearAria={(year) => t("yearAria", { year })} />
      )}
    </main>
  );
}
