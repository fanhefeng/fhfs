"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/Button";
import { buttonStyles, inputClass } from "@/components/ui/controls";
import { lockScroll, unlockScroll } from "@/lib/client/scrollLock";
import type { ShareTarget } from "@/lib/client/shareCard";

type Card = { src: string; qrSrc: string; file: File };

export function ShareDialog({
  target,
  url,
  lang,
  onClose,
}: {
  target: ShareTarget;
  url: string;
  lang: string;
  onClose: () => void;
}) {
  const t = useTranslations("share");
  const headingId = useId();
  const linkId = useId();
  const previewId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  const [card, setCard] = useState<Card>();
  const [cardFailed, setCardFailed] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [status, setStatus] = useState<"copied" | "copyFailed" | "shareFailed">();
  const scanLabel = t("scan");

  useLayoutEffect(() => {
    const element = dialogRef.current!;
    element.showModal();
    lockScroll();
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      if (element.open) element.close();
      unlockScroll({ refresh: true });
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let objectUrl: string | undefined;
    void import("@/lib/client/shareCard")
      .then(({ renderShareCard }) => renderShareCard(target, url, scanLabel))
      .then(({ png, qrSrc }) => {
        if (disposed) return;
        const address = new URL(url);
        const key = address.hash.slice(1) || address.pathname.split("/").at(-1) || "share";
        const file = new File([png], `fhf-${key}.png`, { type: "image/png" });
        objectUrl = URL.createObjectURL(file);
        setCard({ src: objectUrl, qrSrc, file });
      })
      .catch(() => {
        if (!disposed) setCardFailed(true);
      });
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [target, url, scanLabel]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch {
      if (!dialogRef.current?.open) return;
      linkRef.current?.focus({ preventScroll: true });
      linkRef.current?.select();
      setStatus("copyFailed");
    }
  }

  async function nativeShare(data: ShareData) {
    setStatus(undefined);
    try {
      await navigator.share(data);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setStatus("shareFailed");
    }
  }

  const imageShare = card && navigator.canShare?.({ files: [card.file] });
  return (
    <dialog
      ref={dialogRef}
      lang={lang}
      aria-labelledby={headingId}
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
      data-lenis-prevent
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[30rem] overflow-y-auto overscroll-contain rounded-card border border-line bg-surface-raised p-4 text-fg shadow-xl backdrop:bg-black/55 sm:p-6"
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 id={headingId} className="text-heading">
          {t("heading")}
        </h2>
        <Button ref={closeRef} tone="quiet" size="small" onClick={() => dialogRef.current?.close()}>
          {t("close")}
        </Button>
      </header>
      <div className="space-y-2">
        <label htmlFor={linkId} className="text-caption text-fg-secondary">
          {t("link")}
        </label>
        <input
          id={linkId}
          ref={linkRef}
          value={url}
          readOnly
          spellCheck={false}
          dir="ltr"
          className={inputClass}
        />
        <div className="flex flex-wrap gap-2">
          <Button tone="primary" onClick={() => void copyLink()}>
            {t("copy")}
          </Button>
          {typeof navigator.share === "function" && (
            <Button onClick={() => void nativeShare({ title: target.title, url })}>
              {t("systemLink")}
            </Button>
          )}
          {card && (
            <Button
              tone="choice"
              aria-pressed={showQr}
              aria-controls={previewId}
              onClick={() => setShowQr((visible) => !visible)}
            >
              {t("qr")}
            </Button>
          )}
        </div>
        <p role="status" className="text-caption text-fg-secondary empty:sr-only">
          {status && t(status)}
        </p>
      </div>
      <figure id={previewId} className="mt-5 space-y-3">
        {card ? (
          <>
            {showQr ? (
              <div className="grid justify-items-center rounded-chip border border-line bg-white pb-3 text-[#292823]">
                <img
                  src={card.qrSrc}
                  alt={t("qrAlt", { title: target.title })}
                  className="block w-full max-w-64 [image-rendering:pixelated]"
                />
                <p className="text-caption">{scanLabel}</p>
              </div>
            ) : (
              <img
                src={card.src}
                alt={t("cardAlt", { title: target.title })}
                className="block w-full rounded-chip border border-line"
              />
            )}
            <div className="flex flex-wrap gap-2">
              <a href={card.src} download={card.file.name} className={buttonStyles()}>
                {t("save")}
              </a>
              {imageShare && (
                <Button onClick={() => void nativeShare({ files: [card.file] })}>
                  {t("systemCard")}
                </Button>
              )}
            </div>
          </>
        ) : (
          <p role="status" className="rounded-chip bg-surface p-4 text-caption text-fg-secondary">
            {t(cardFailed ? "cardFailed" : "loading")}
          </p>
        )}
      </figure>
    </dialog>
  );
}
