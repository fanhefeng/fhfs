"use client";

import { Icon } from "@/components/icons/Icon";
import { useId, useMemo, useState } from "react";
import type { ActionState } from "../actions/shared";
import { RecordForm, type Field, type RecordData } from "./RecordForm";
import {
  buttonClass,
  cardClass,
  choiceButtonClass,
  fieldSkin,
  ghostButtonClass,
  hintClass,
  listRowClass,
  metaClass,
  sectionHeadingClass,
} from "../styles";
import { MediaGallery, type PreviewMedia } from "./MediaPreview";

type ListRow = {
  /** Stable identity, and the key React uses. */
  id: string;
  /** The row's headline, composed on the server. */
  label: string;
  /** The dimmer line beside it. */
  meta?: string;
  /** Not on the public page yet. A list with any such row can show only those. */
  draft?: boolean;
  /** The row's own page out front, when it has one — drafts included, through
   *  the preview (`/admin/preview`). */
  view?: string;
  /** Saved files can be checked without opening their editing form. */
  media?: PreviewMedia[];
  data: RecordData;
};

/** Which rows the list shows, by whether they are out front. */
type View = "all" | "public" | "draft";

const VIEWS: { view: View; label: string }[] = [
  { view: "all", label: "全部" },
  { view: "public", label: "已公开" },
  { view: "draft", label: "草稿" },
];

/**
 * A list where each row opens into its own form.
 *
 * These tables hold a handful of rows each, apart from the board; a separate
 * route per record would mean a page load
 * to change a word. Everything is on the page already; opening a row just
 * reveals it. The filter box is what makes that scale: it matches the row's
 * headline, its dim line and its key, which between them carry the date, the
 * collection and the first words of the text. Where some rows are drafts, a
 * row of three buttons beside it narrows the list to the published ones or
 * the drafts — an import can bring in dozens of drafts, each waiting on a
 * decision, and a text match on "草稿" also finds a line that says the word.
 *
 * Rows arrive with their labels already composed. A server component may hand
 * a Server Action across this boundary but not an ordinary function, so
 * anything like `labelOf` has to be applied before the props are built.
 *
 * `blank` puts a "new row" form behind a button at the top — open, it is the
 * same form as an existing row's — and `deleteAction` a delete control inside
 * each row.
 */
export function RecordList({
  action,
  fields,
  rows,
  blank,
  blankLabel = "新建",
  deleteAction,
  /** The word this table counts in: 条 / 篇 / 张. */
  unit = "条",
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  fields: Field[];
  rows: ListRow[];
  /** Starting values for a new row; omit to make the list edit-only. */
  blank?: RecordData;
  blankLabel?: string;
  deleteAction?: (form: FormData) => Promise<void>;
  unit?: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  // Uncontrolled fields and upload widgets keep their state in the mounted form.
  const [visited, setVisited] = useState<ReadonlySet<string>>(() => new Set());
  const [creation, setCreation] = useState<"unused" | "open" | "closed">("unused");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("all");
  const listId = useId();
  const creating = creation === "open";

  const drafts = useMemo(() => rows.filter((row) => row.draft).length, [rows]);
  // With no drafts left the buttons are gone, so a stale choice must not keep
  // hiding the list behind them.
  const current = drafts ? view : "all";

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matching = rows.filter(
      (row) =>
        (current === "all" || (current === "draft") === Boolean(row.draft)) &&
        (!needle || `${row.id} ${row.label} ${row.meta ?? ""}`.toLowerCase().includes(needle)),
    );
    return new Set(matching.map((row) => row.id));
  }, [rows, query, current]);
  const narrowed = Boolean(query) || current !== "all";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {rows.length > 8 && (
          <div className="relative min-w-0 flex-1 basis-48 sm:max-w-xs">
            <Icon
              name="search"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-tertiary"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="筛选…"
              aria-label="筛选这张表"
              className={`${fieldSkin} h-11 w-full pr-3 pl-9 text-body placeholder:text-fg-tertiary`}
            />
          </div>
        )}

        {drafts > 0 && (
          <div role="group" aria-label="按公开状态筛选" className="flex flex-wrap gap-1.5">
            {VIEWS.map(({ view: value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setView(value)}
                aria-pressed={current === value}
                className={choiceButtonClass}
              >
                {label}
                {value === "draft" && <span className="font-mono tabular-nums">{drafts}</span>}
              </button>
            ))}
          </div>
        )}

        {/* The plain total is already beside the page title — this line only
            has something to add once the list is being filtered. */}
        {narrowed && (
          <span role="status" className={`${metaClass} tabular-nums`}>
            {shown.size} / {rows.length} {unit}
          </span>
        )}

        {blank && (
          <button
            type="button"
            onClick={() => {
              setCreation((value) => (value === "open" ? "closed" : "open"));
              setOpen(null);
            }}
            aria-expanded={creating}
            aria-controls={`${listId}-new`}
            className={`${creating ? ghostButtonClass : buttonClass} ml-auto`}
          >
            {creating ? "收起" : blankLabel}
          </button>
        )}
      </div>

      {blank && (
        <section id={`${listId}-new`} hidden={!creating} className={`${cardClass} mt-4 p-4 sm:p-6`}>
          <h2 className={`${sectionHeadingClass} mb-4`}>{blankLabel}</h2>
          {creation !== "unused" && (
            <RecordForm action={action} fields={fields} record={blank} isNew />
          )}
        </section>
      )}

      <ul hidden={shown.size === 0} className="mt-4 border-t border-line">
        {rows.map((row, index) => {
          const isShown = shown.has(row.id);
          const isOpen = open === row.id;
          const panelId = `${listId}-row-${index}`;
          return (
            <li key={row.id} hidden={!isShown} className="border-b border-line">
              <button
                type="button"
                onClick={() => {
                  setVisited((seen) => (seen.has(row.id) ? seen : new Set(seen).add(row.id)));
                  setOpen(isOpen ? null : row.id);
                }}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className={`${listRowClass} flex w-full items-center justify-between gap-3 text-left ${
                  isOpen ? "bg-surface" : ""
                }`}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
                  <span
                    className={`line-clamp-2 min-w-0 flex-1 break-words text-body group-hover:text-accent ${
                      row.draft ? "text-fg-secondary" : ""
                    }`}
                  >
                    {row.label || <span className="text-fg-tertiary">（空）</span>}
                  </span>
                  {row.meta && (
                    <span className="font-mono text-meta break-words text-fg-tertiary sm:max-w-[40%] sm:text-right">
                      {row.meta}
                    </span>
                  )}
                </span>
                <span aria-hidden className="shrink-0 text-caption font-medium text-fg-secondary">
                  {isOpen ? "收起" : "编辑"}
                </span>
              </button>

              {isShown && !isOpen && Boolean(row.media?.length) && (
                <div className="px-3 pb-3">
                  <MediaGallery items={row.media!} compact limit={3} />
                </div>
              )}

              <div id={panelId} hidden={!isOpen} className="px-3 pt-4 pb-6 sm:px-4">
                {visited.has(row.id) && (
                  <RecordForm
                    action={action}
                    fields={fields}
                    record={row.data}
                    deleteAction={deleteAction}
                    view={row.view}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {shown.size === 0 && (
        <p className={`mt-4 rounded-card border border-dashed border-line px-4 py-5 ${hintClass}`}>
          {rows.length === 0
            ? "还没有内容。"
            : query
              ? `没有匹配「${query}」的。`
              : "这一栏是空的。"}
        </p>
      )}
    </>
  );
}
