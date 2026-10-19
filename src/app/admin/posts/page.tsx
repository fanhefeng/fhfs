import Link from "@/components/ui/Link";

import { AdminChrome } from "../AdminChrome";
import { ghostButtonClass } from "../styles";

export default function PostsIndex({
  data,
}: {
  data: Awaited<ReturnType<typeof import("./page.server").loadPageData>>;
}) {
  const { rows } = data;

  return (
    <AdminChrome
      title="文章"
      section="/admin/posts"
      action={
        <Link href="/admin/posts/new" className={ghostButtonClass}>
          <span aria-hidden className="text-fg-tertiary">
            +
          </span>
          写新的
        </Link>
      }
    >
      <ul className="divide-y divide-line border-y border-line">
        {rows.map((post) => (
          <li key={`${post.slug}.${post.locale}`}>
            <Link
              href={`/admin/posts/${post.slug}/${post.locale}`}
              className="group flex min-h-15 flex-wrap items-baseline gap-x-3 gap-y-1 px-2 py-3.5 transition-colors hover:bg-surface/60"
            >
              <span className="font-mono text-meta text-fg-tertiary tabular-nums">{post.date}</span>
              <span className="font-mono text-meta uppercase text-fg-tertiary">{post.locale}</span>
              <span className="order-first w-full min-w-0 break-words text-body transition-colors group-hover:text-accent sm:order-none sm:w-auto sm:flex-1">
                {post.title}
              </span>
              {post.draft && (
                <span className="font-mono text-meta uppercase tracking-meta text-accent">
                  草稿
                </span>
              )}
              <span className="font-mono text-meta text-fg-tertiary tabular-nums">
                {post.readingMinutes}m
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </AdminChrome>
  );
}
