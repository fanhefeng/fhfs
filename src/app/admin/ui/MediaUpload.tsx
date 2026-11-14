"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";
import { Feedback } from "@/components/ui/Feedback";
import {
  inspectMedia,
  sendMedia,
  uploadOperation,
  type UploadPhase,
  type UploadedMedia,
} from "@/lib/client/mediaUpload";
import { uploadFile } from "@/lib/mediaUploads";
import { hintClass } from "../styles";
import { MediaPreview } from "./MediaPreview";

type Item = {
  id: string;
  name: string;
  local: string;
  kind: UploadedMedia["kind"];
  busy: boolean;
  phase: "inspecting" | UploadPhase | `poster-${UploadPhase}`;
  media?: UploadedMedia;
  error?: string;
  controller: AbortController;
  posterId?: string;
};

const PHASE_LABELS: Record<Item["phase"], string> = {
  inspecting: "读取文件信息…",
  preparing: "准备上传…",
  uploading: "上传文件…",
  confirming: "确认文件可用…",
  "poster-preparing": "准备上传封面…",
  "poster-uploading": "上传封面…",
  "poster-confirming": "确认封面可用…",
};
type Props = {
  kind?: "image" | "audio" | "list";
  onUploaded: (media: UploadedMedia) => void;
  onRemove: (src: string) => void;
  showReadyPreview?: boolean;
};

/** Each field owns a disposable batch; saved files are protected by the server. */
export function MediaUpload({
  kind = "list",
  onUploaded,
  onRemove,
  showReadyPreview = true,
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const batch = useRef("");
  const current = useRef<Item[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const callbacks = useRef({ onUploaded, onRemove });
  callbacks.current = { onUploaded, onRemove };
  const update = (next: Item[]) => {
    current.current = next;
    setItems(next);
  };
  const change = (id: string, patch: Partial<Item>) =>
    update(current.current.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  useEffect(() => {
    const form = root.current?.closest("form");
    const dispose = () => {
      const oldBatch = batch.current;
      batch.current = "";
      for (const item of current.current) {
        item.controller.abort();
        URL.revokeObjectURL(item.local);
      }
      current.current = [];
      if (oldBatch)
        void uploadOperation({ action: "cancel", batch: oldBatch }, undefined, true).catch(() => {
          /* the scheduled sweep retries abandoned batches */
        });
    };
    const reset = () => {
      dispose();
      setItems([]);
      setError("");
    };
    const leaving = (event: PageTransitionEvent) => {
      if (!event.persisted) dispose();
    };
    form?.addEventListener("reset", reset);
    window.addEventListener("pagehide", leaving);
    return () => {
      form?.removeEventListener("reset", reset);
      window.removeEventListener("pagehide", leaving);
      dispose();
    };
  }, []);

  const add = async (files: File[]) => {
    if (!batch.current) batch.current = crypto.randomUUID();
    const selectedBatch = batch.current;
    for (const file of files) {
      if (batch.current !== selectedBatch) break;
      const format = uploadFile(file.name, file.size);
      if (!format.ok) {
        setError(format.error);
        continue;
      }
      if (kind !== "list" && kind !== format.kind) {
        setError(`请选择${kind === "image" ? "图片" : "音频"}文件。`);
        continue;
      }
      const item: Item = {
        id: crypto.randomUUID(),
        name: file.name,
        kind: format.kind,
        local: URL.createObjectURL(file),
        busy: true,
        phase: "inspecting",
        controller: new AbortController(),
      };
      update([...current.current, item]);
      setError("");
      const ownsItem = () =>
        batch.current === selectedBatch &&
        current.current.some((existing) => existing.id === item.id);
      const active = () => ownsItem() && !item.controller.signal.aborted;
      const phase = (next: Item["phase"]) => {
        if (active()) change(item.id, { phase: next });
      };
      try {
        const { posterFile, ...measured } = await inspectMedia(
          file,
          item.local,
          item.controller.signal,
        );
        item.controller.signal.throwIfAborted();
        const src = await sendMedia(file, item.id, selectedBatch, item.controller.signal, phase);
        let poster: string | undefined;
        if (posterFile) {
          item.posterId = crypto.randomUUID();
          change(item.id, { posterId: item.posterId });
          poster = await sendMedia(
            posterFile,
            item.posterId,
            selectedBatch,
            item.controller.signal,
            (next) => phase(`poster-${next}`),
          );
        }
        item.controller.signal.throwIfAborted();
        if (!active()) continue;
        const media = { ...measured, src, poster };
        callbacks.current.onUploaded(media);
        if (active()) change(item.id, { busy: false, media });
      } catch (failure) {
        if (active())
          change(item.id, {
            busy: false,
            error: failure instanceof Error ? failure.message : "上传未完成，请重新选择文件。",
          });
      }
    }
  };

  const remove = async (item: Item) => {
    const currentItem = current.current.find((existing) => existing.id === item.id);
    if (!currentItem) return;
    const selectedBatch = batch.current;
    const ownsItem = () =>
      batch.current === selectedBatch &&
      current.current.some((existing) => existing.id === item.id);
    currentItem.controller.abort();
    try {
      await uploadOperation({ action: "cancel", batch: selectedBatch, id: item.id });
      if (currentItem.posterId)
        await uploadOperation({ action: "cancel", batch: selectedBatch, id: currentItem.posterId });
      if (!ownsItem()) return;
      if (currentItem.media) callbacks.current.onRemove(currentItem.media.src);
      URL.revokeObjectURL(currentItem.local);
      update(current.current.filter((existing) => existing.id !== item.id));
    } catch (failure) {
      if (!ownsItem()) return;
      change(item.id, {
        busy: false,
        error: failure instanceof Error ? failure.message : "清理未完成，请重试。",
      });
    }
  };

  return (
    <div
      ref={root}
      className="space-y-3"
      data-upload-pending={items.some((item) => item.busy) ? "true" : undefined}
    >
      <input
        ref={input}
        type="file"
        className="sr-only"
        tabIndex={-1}
        aria-label={
          kind === "image"
            ? "选择上传的图片"
            : kind === "audio"
              ? "选择上传的音频"
              : "选择上传的媒体文件"
        }
        accept={kind === "list" ? "image/*,audio/*,video/*" : `${kind}/*`}
        multiple={kind === "list"}
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          event.target.value = "";
          void add(files);
        }}
      />
      <Button onClick={() => input.current?.click()}>
        <Icon name="upload" className="size-4" />
        上传{kind === "image" ? "图片" : kind === "audio" ? "音频" : "图片 / 音频 / 视频"}
      </Button>
      <p className={hintClass}>
        单个文件最多 25 MiB。取消编辑会清理未保存的上传；异常中断的文件 24
        小时后自动清理。草稿会保留。
      </p>
      {error && <Feedback tone="error">{error}</Feedback>}
      {items.map((item) => (
        <div key={item.id} className="space-y-2 rounded-chip border border-line p-3">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-caption">
            <span role="status" className="min-w-0 break-all">
              {item.name} ·{" "}
              {item.busy ? PHASE_LABELS[item.phase] : item.error ? "未完成" : "已上传，等待保存"}
            </span>
            <button
              type="button"
              onClick={() => {
                void remove(item);
              }}
              className="min-h-11 shrink-0 text-fg-secondary underline underline-offset-4"
            >
              移除并清理
            </button>
          </div>
          {(showReadyPreview || item.busy || item.error) && (
            <MediaPreview media={{ kind: item.kind, src: item.local, local: true }} />
          )}
          {item.error && <Feedback tone="error">{item.error}</Feedback>}
        </div>
      ))}
    </div>
  );
}
