import { AdminChrome } from "../../../AdminChrome";
import { Note } from "../../../ui/Note";
import { PostForm } from "../../PostForm";

export default function EditPost({
  data,
}: {
  data: Awaited<ReturnType<typeof import("./page.server").loadPageData>>;
}) {
  const { post, imported } = data;
  const { slug, locale } = post;

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
      {imported && (
        <Note>
          首次保存后，这篇会改由后台维护，网址沿用原地址。
          {!post.date && " 原稿未记日期，请填写这次编辑版的发布日期。"}
        </Note>
      )}
      <PostForm
        isNew={false}
        imported={imported}
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
