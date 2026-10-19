import { notFound } from "@/lib/navigation";

import { AdminChrome } from "../../../AdminChrome";
import { PostForm } from "../../PostForm";

export default function EditPost({
  data,
}: {
  data: Awaited<ReturnType<typeof import("./page.server").loadPageData>>;
}) {
  const { slug, locale, post } = data;

  if (!post) notFound();
  return (
    <AdminChrome
      title={post.title}
      section="/admin/posts"
      blurb={`${slug} · ${locale}`}
      // A draft 404s on the site — no point linking to it.
      sub
      view={post.draft ? null : `/${locale}/blog/${slug}`}
      action={
        post.draft ? (
          <span className="font-mono text-meta uppercase tracking-meta text-accent">
            草稿，未发布
          </span>
        ) : null
      }
    >
      <PostForm
        isNew={false}
        post={{
          slug: post.slug,
          locale: post.locale,
          title: post.title,
          date: post.date,
          summary: post.summary,
          tags: post.tags,
          draft: post.draft,
          bodyMd: post.bodyMd,
        }}
      />
    </AdminChrome>
  );
}
