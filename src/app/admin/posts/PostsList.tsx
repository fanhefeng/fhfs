"use client";

import { useId, useState } from "react";
import Link from "@/components/ui/Link";
import { Icon } from "@/components/icons/Icon";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { listRowClass } from "../styles";

type Row = Awaited<ReturnType<typeof import("./page.server").loadPageData>>["rows"][number];
type View = "all" | "draft" | "imported";

/** Filtering a long index never changes the loaded rows or their edit links. */
export function PostsList({ rows }: { rows: Row[] }) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("all");
  const needle = query.trim().toLocaleLowerCase();
  const shown = rows.filter(
    (post) =>
      (view === "all" || (view === "draft" ? post.draft : post.imported)) &&
      (!needle ||
        `${post.title} ${post.slug} ${post.date ?? ""} ${post.locale}`
          .toLocaleLowerCase()
          .includes(needle)),
  );
  const narrowed = Boolean(needle) || view !== "all";

  return (
    <>
      <div className="mb-4 space-y-3">
        <label htmlFor={searchId} className="relative block max-w-md">
          <span className="sr-only">筛选文章</span>
          <Icon
            name="search"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-tertiary"
          />
          <Input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="按标题、日期或文章地址查找"
            className="pl-10"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="按文章类型筛选" className="flex flex-wrap gap-1.5">
            {(
              [
                { value: "all", label: "全部" },
                { value: "draft", label: "草稿" },
                { value: "imported", label: "导入稿" },
              ] as const
            ).map(({ value, label }) => (
              <Button
                key={value}
                type="button"
                aria-pressed={view === value}
                onClick={() => setView(value)}
                tone="choice"
              >
                {label}
              </Button>
            ))}
          </div>
          <p role="status" className="ml-auto text-caption text-fg-tertiary tabular-nums">
            {narrowed ? `${shown.length} / ${rows.length} 篇` : `${rows.length} 篇`}
          </p>
        </div>
      </div>

      {shown.length === 0 && (
        <div className="border-y border-line py-8">
          <p className="text-body">{narrowed ? "没有符合条件的文章。" : "还没有文章。"}</p>
          {narrowed && (
            <Button
              type="button"
              onClick={() => {
                setQuery("");
                setView("all");
              }}
              className="mt-3"
            >
              清除筛选
            </Button>
          )}
        </div>
      )}
      <ul className="divide-y divide-line border-y border-line">
        {shown.map((post) => (
          <li key={`${post.slug}.${post.locale}`}>
            <Link
              href={`/admin/posts/${post.slug}/${post.locale}`}
              className={`${listRowClass} flex flex-wrap items-baseline gap-x-3 gap-y-1`}
            >
              <span className="font-mono text-meta text-fg-tertiary tabular-nums">
                {post.date ?? "日期未记"}
              </span>
              <span className="font-mono text-meta uppercase text-fg-tertiary">{post.locale}</span>
              <span className="order-first w-full min-w-0 break-words text-body transition-colors group-hover:text-accent group-focus-visible:text-accent sm:order-none sm:w-auto sm:flex-1">
                {post.title}
              </span>
              {post.imported && <span className="text-caption text-fg-tertiary">导入稿</span>}
              {post.draft && <Badge tone="draft">草稿</Badge>}
              <span className="font-mono text-meta text-fg-tertiary tabular-nums">
                {post.readingMinutes}m
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
