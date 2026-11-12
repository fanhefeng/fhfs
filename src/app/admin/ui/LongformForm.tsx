"use client";

import { Input, Textarea } from "@/components/ui/Field";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type { ActionState } from "../actions/shared";
import { choiceButtonClass, errorClass, labelClass, monoClass } from "../styles";
import { SaveControls } from "./SaveControls";
import { DeleteRow } from "./DeleteRow";
import { useFieldErrors } from "./fieldErrors";
import { useSaveAction } from "./useSaveAction";
import { Select } from "./Select";
import { Toggle } from "./Segmented";
import { KEY_MESSAGE, KEY_PATTERN } from "@/lib/forms";
import { MediaUpload } from "./MediaUpload";

/** What a post and a secret both are, as the form edits them. */
export type LongformDraft = {
  slug: string;
  locale: "zh" | "en";
  title: string;
  date: string;
  summary: string;
  draft: boolean;
  bodyMd: string;
};

/**
 * The long-form editor: a plain textarea for markdown, and the rest as fields.
 * Posts and secrets are this form with a few fields of their own — the
 * secret's kind beside the address (`head`), the post's tags or the episode's
 * audio beside the draft switch (`extras`) — and used to be two copies of it.
 *
 * The preview is not a second renderer: "预览" posts the textarea to
 * `/admin/preview/markdown`, which runs the save's own pipeline and hands back
 * the HTML a save would store, drawn in the article's own `.prose-editorial`.
 * "在站上看" goes further — the real page, in Draft Mode, draft or not — and
 * shows the last save, which is why it is only there once there is one.
 */
export function LongformForm({
  action,
  deleteAction,
  doc,
  isNew,
  imported = false,
  head,
  extras,
  extrasCols,
  draftHint,
  bodyLabel,
  datePlaceholder,
  previewKind,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  deleteAction: (form: FormData) => Promise<void>;
  doc: LongformDraft;
  isNew: boolean;
  imported?: boolean;
  /** Fields between the language and the date. */
  head?: ReactNode;
  /** Fields in the row that ends with the draft switch. */
  extras: ReactNode;
  extrasCols: string;
  draftHint: string;
  bodyLabel: string;
  datePlaceholder: string;
  /** Which room "在站上看" opens the piece in. */
  previewKind: "post" | "secret";
}) {
  const { state, pending, formProps } = useSaveAction(action);
  const body = useRef<HTMLTextAreaElement>(null);
  const bodyLabelId = useId();
  const check = useFieldErrors();
  const localeLabel = useId();
  const addressEditable = isNew && !imported;

  return (
    <>
      <form {...formProps} className="space-y-4 sm:space-y-5" {...check.formProps}>
        {/* Tells the action to refuse an existing address and, once saved, to
            redirect to the edit page: this page's props are a blank draft, and
            a saved form resets to its props (useSaveAction) — without the
            redirect a successful save would wipe the editor. */}
        {(isNew || imported) && (
          <input type="hidden" name="isNew" value={imported ? "imported" : "1"} />
        )}
        <div
          className={`grid grid-cols-2 gap-3 sm:gap-4 ${head ? "md:grid-cols-[minmax(0,1fr)_9rem_9rem_10rem]" : "sm:grid-cols-[minmax(0,1fr)_9rem_10rem]"}`}
        >
          <label
            className={`col-span-full min-w-0 space-y-1.5 ${head ? "md:col-span-1" : "sm:col-span-1"}`}
          >
            <span className={labelClass}>slug</span>
            <Input
              name="slug"
              defaultValue={doc.slug}
              readOnly={!addressEditable}
              required
              pattern={KEY_PATTERN}
              data-mismatch={KEY_MESSAGE}
              {...check.field("slug")}
            />
            {check.message("slug")}
          </label>

          <div className="min-w-0 space-y-1.5">
            <span id={localeLabel} className={labelClass}>
              语言
            </span>
            <Select
              name="locale"
              labelledBy={localeLabel}
              defaultValue={doc.locale}
              disabled={!addressEditable}
              options={[
                { value: "zh", label: "zh · 中文" },
                { value: "en", label: "en · English" },
              ]}
            />
            {/* A disabled control submits nothing — keep the value in the post. */}
            {!addressEditable && <input type="hidden" name="locale" value={doc.locale} />}
          </div>

          {head}

          <label className={`min-w-0 space-y-1.5 ${head ? "col-span-full md:col-span-1" : ""}`}>
            <span className={labelClass}>日期</span>
            <Input
              name="date"
              defaultValue={doc.date}
              placeholder={imported && !doc.date ? "填写发布日期" : datePlaceholder}
              required
              pattern="\d{4}-\d{2}-\d{2}"
              data-mismatch="日期要写成 YYYY-MM-DD。"
              {...check.field("date")}
            />
            {check.message("date")}
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className={labelClass}>标题</span>
          <Input name="title" defaultValue={doc.title} required {...check.field("title")} />
          {check.message("title")}
        </label>

        <label htmlFor={`${bodyLabelId}-summary`} className="block space-y-1.5">
          <span className={labelClass}>摘要</span>
          <Input id={`${bodyLabelId}-summary`} name="summary" defaultValue={doc.summary} />
        </label>

        <div className={`grid gap-3 sm:gap-4 ${extrasCols}`}>
          {extras}
          <div className="flex items-end">
            <Toggle
              name="draft"
              defaultChecked={doc.draft}
              label="草稿"
              hint={imported ? "保存为草稿会暂时下架原网址" : draftHint}
              onLabel="草稿"
              offLabel="已公开"
            />
          </div>
        </div>

        <div className="space-y-2">
          {!isNew && !imported && (
            <a
              href={`/admin/preview?${new URLSearchParams({
                kind: previewKind,
                slug: doc.slug,
                locale: doc.locale,
              })}`}
              target="_blank"
              rel="noopener"
              className="inline-flex min-h-11 items-center text-caption text-fg-secondary underline decoration-line underline-offset-4 hover:text-accent"
            >
              在站上看上次保存的版本
            </a>
          )}
          <MarkdownPreview
            source={body}
            heading={
              <span id={bodyLabelId} className={labelClass}>
                {bodyLabel}
              </span>
            }
          >
            <Textarea
              ref={body}
              name="bodyMd"
              aria-labelledby={bodyLabelId}
              defaultValue={doc.bodyMd}
              rows={24}
              spellCheck={false}
              className={`${monoClass}`}
            />
          </MarkdownPreview>
          <MediaUpload
            kind="image"
            onUploaded={(media) => {
              if (body.current) body.current.value += `\n\n![图片](${media.src})\n`;
            }}
            onRemove={(src) => {
              if (body.current)
                body.current.value = body.current.value.replace(`![图片](${src})`, "");
            }}
          />
        </div>

        <SaveControls state={state} pending={pending} sticky cancelable />
      </form>

      {!isNew && !imported && (
        <DeleteRow
          action={deleteAction}
          fields={{ slug: doc.slug, locale: doc.locale }}
          what={`${doc.slug}.${doc.locale}`}
          label="删除这篇"
        />
      )}
    </>
  );
}

/**
 * 写 / 预览 over the body. The textarea stays mounted while the preview is up,
 * only hidden: the form is uncontrolled, and unmounting the field would drop
 * what was typed — and leave it out of the next save.
 */
function MarkdownPreview({
  source,
  heading,
  children,
}: {
  source: RefObject<HTMLTextAreaElement | null>;
  heading: ReactNode;
  children: ReactNode;
}) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const task = useRef<AbortController | null>(null);
  const showing = html !== null;

  const write = useCallback(() => {
    const previous = task.current;
    task.current = null;
    previous?.abort();
    setHtml(null);
    setError(null);
    setBusy(false);
  }, []);

  useEffect(() => {
    const form = source.current?.form;
    let live = true;
    let resetTimer: number | undefined;
    // A native click can checkpoint microtasks between reset listeners. Wait
    // for the full dispatch, including later preventDefault(), and its default action.
    const reset = (event: Event) => {
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        if (live && !event.defaultPrevented) write();
      }, 0);
    };
    form?.addEventListener("reset", reset);
    return () => {
      live = false;
      window.clearTimeout(resetTimer);
      form?.removeEventListener("reset", reset);
      const previous = task.current;
      task.current = null;
      previous?.abort();
    };
  }, [source, write]);

  const preview = async () => {
    task.current?.abort();
    const controller = new AbortController();
    task.current = controller;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/admin/preview/markdown", {
        method: "POST",
        body: source.current?.value ?? "",
        signal: controller.signal,
      });
      if (task.current !== controller) return;
      if (response.status === 401) setError("登录过期了，先在新标签页重新登录，这里的内容不会丢。");
      else if (!response.ok) setError(`预览失败（${response.status}）。`);
      else {
        const rendered = await response.text();
        if (task.current === controller) setHtml(rendered);
      }
    } catch {
      if (task.current === controller && !controller.signal.aborted)
        setError("预览失败：连不上服务器。");
    } finally {
      if (task.current === controller) {
        task.current = null;
        setBusy(false);
      }
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {heading}
        <div role="group" aria-label="正文视图" className="flex gap-2">
          <ViewButton pressed={!showing} onClick={write}>
            写
          </ViewButton>
          <ViewButton pressed={showing} onClick={() => void preview()} disabled={busy}>
            {busy ? "渲染中…" : showing ? "刷新预览" : "预览"}
          </ViewButton>
        </div>
      </div>
      {error && (
        <p role="alert" className={errorClass}>
          {error}
        </p>
      )}
      <div hidden={showing}>{children}</div>
      {showing && (
        <div className="rounded-chip border border-line bg-surface px-6 py-8">
          <div className="prose-editorial" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      )}
    </>
  );
}

function ViewButton({
  pressed,
  onClick,
  disabled,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      disabled={disabled}
      className={choiceButtonClass}
    >
      {children}
    </button>
  );
}
