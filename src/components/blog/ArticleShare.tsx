import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import { shareArticle, type ArticleShareTarget } from "@/lib/articleShare";

type Status = "idle" | "busy" | "copied" | "manual";

export function useArticleShare(target: ArticleShareTarget | null) {
  const [status, setStatus] = useState<Status>("idle");
  const locked = useRef(false);
  const mounted = useRef(true);
  const timer = useRef<number | undefined>(undefined);
  // Invalidate the action during route commit, before pending promise fallbacks.
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      window.clearTimeout(timer.current);
    };
  }, []);

  const run = useCallback(async () => {
    if (!target || locked.current) return;
    locked.current = true;
    window.clearTimeout(timer.current);
    setStatus("busy");
    const result = await shareArticle(target, navigator, () => mounted.current);
    locked.current = false;
    if (!mounted.current) return;
    if (result === "copied") {
      setStatus("copied");
      timer.current = window.setTimeout(() => setStatus("idle"), 2000);
    } else {
      setStatus(result === "manual" ? "manual" : "idle");
    }
  }, [target]);

  return target ? { url: target.url, status, run, reset: () => setStatus("idle") } : null;
}

export function ArticleShare({ share }: { share: ReturnType<typeof useArticleShare> }) {
  const t = useTranslations("blog");
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  useEffect(() => {
    if (share?.status === "manual" && dialog.current && !dialog.current.open)
      dialog.current.showModal();
  }, [share?.status]);

  if (!share) return null;
  return (
    <>
      <button
        type="button"
        disabled={share.status === "busy"}
        aria-busy={share.status === "busy"}
        onClick={share.run}
        className="mt-4 inline-flex min-h-11 items-center rounded-full border border-line px-4 text-caption text-fg transition-colors hover:bg-fg/5 disabled:opacity-50 print:hidden"
      >
        {share.status === "copied" ? t("fabShareDone") : t("fabShare")}
      </button>
      <span className="sr-only" role="status">
        {share.status === "copied" ? t("fabShareDone") : ""}
      </span>
      <dialog
        ref={dialog}
        aria-labelledby={title}
        onClose={share.reset}
        className="m-auto max-w-[min(90vw,32rem)] rounded-xl border border-line bg-bg p-6 text-fg backdrop:bg-black/50"
      >
        <p id={title} className="text-fg">
          {t("shareManual")}
        </p>
        <input
          readOnly
          aria-label={t("shareLink")}
          onFocus={(event) => event.currentTarget.select()}
          value={share.url}
          className="mt-3 w-full rounded border border-line px-2 py-1"
        />
        <form method="dialog" className="mt-4">
          <button type="submit" className="min-h-11 rounded border border-line px-3">
            {t("shareClose")}
          </button>
        </form>
      </dialog>
    </>
  );
}
