"use client";

import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";
import { Feedback } from "@/components/ui/Feedback";
import { useEffect, useRef, useState } from "react";
import type { ActionState } from "../actions/shared";

/**
 * The submit button and the error/saved lines every admin form ends with.
 *
 * "已保存" fades itself out after a few seconds: it is news, and a line that
 * stays forever stops being read — while an error stays until the next attempt
 * clears it, because it is a thing still to be fixed. `sticky` pins the row to
 * the viewport bottom for the long one-page forms.
 */
export function SaveControls({
  state,
  pending,
  label = "保存",
  sticky = false,
  cancelable = false,
}: {
  state: ActionState;
  pending: boolean;
  label?: string;
  sticky?: boolean;
  cancelable?: boolean;
}) {
  const [saved, setSaved] = useState(false);
  const controls = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = controls.current;
    const form = bar?.closest("form");
    if (!sticky || !bar || !form) return;

    // Scroll-to-field (including keyboard focus and validation) must clear
    // the whole bar. Its height changes when messages wrap or fonts resize.
    const measure = () => {
      form.style.setProperty(
        "--admin-save-height",
        `${Math.ceil(bar.getBoundingClientRect().height)}px`,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      form.style.removeProperty("--admin-save-height");
    };
  }, [sticky]);

  useEffect(() => {
    if (!state.ok) {
      setSaved(false);
      return;
    }
    setSaved(true);
    const timer = setTimeout(() => setSaved(false), 6000);
    return () => clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    const form = controls.current?.closest("form");
    const edited = () => setSaved(false);
    form?.addEventListener("input", edited);
    form?.addEventListener("change", edited);
    return () => {
      form?.removeEventListener("input", edited);
      form?.removeEventListener("change", edited);
    };
  }, []);

  const messages = (
    <>
      {cancelable && (
        <Button type="reset" disabled={pending}>
          取消本次编辑
        </Button>
      )}
      {!pending && state.error && (
        <Feedback tone="error" className="min-w-0 basis-full">
          {state.error}
        </Feedback>
      )}
      {!pending && saved && <Feedback tone="success">已保存。前台最多 30 秒更新。</Feedback>}
    </>
  );

  const button = (
    <Button type="submit" tone="primary" busy={pending}>
      {!pending && <Icon name={label === "发布" ? "moments" : "save"} className="size-4" />}
      {pending ? "保存中…" : label}
    </Button>
  );

  if (sticky) {
    return (
      <div
        ref={controls}
        data-sticky-save=""
        className="sticky bottom-0 z-20 -mx-4 mt-5 flex flex-wrap items-center gap-2 border-t border-line bg-bg px-4 pt-2.5 pb-[max(.625rem,env(safe-area-inset-bottom))] sm:-mx-8 sm:gap-3 sm:px-8 lg:-mx-10 lg:px-10"
      >
        {button}
        {messages}
      </div>
    );
  }
  return (
    <div
      ref={controls}
      className="flex flex-wrap items-center gap-2 border-t border-line pt-4 sm:gap-3"
    >
      {button}
      {messages}
    </div>
  );
}
