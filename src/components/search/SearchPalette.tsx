"use client";

import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "use-intl";
import { Link } from "@/i18n/navigation";
import { lockScroll, unlockScroll } from "@/lib/client/scrollLock";
import { search, type SearchEntry, type SearchHit } from "@/lib/search";
import { loadSearchIndex } from "@/lib/client/searchIndex";

/**
 * ⌘K: one field over everything the site holds, in a native `<dialog>` so
 * focus, Escape and the top layer are the browser's. The field is a combobox
 * over a listbox of links: arrows move, Enter follows the highlighted link by
 * clicking it — so a jump from here goes through the route veil like any
 * other link — and a pointer can simply click. With nothing typed it lists
 * the site's pages, which is where most people who press it want to go.
 */
export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("search");
  const locale = useLocale();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lockedRef = useRef(false);
  const [entries, setEntries] = useState<SearchEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    let live = true;
    setFailed(false);
    setEntries(null);
    setActive(0);
    loadSearchIndex(locale).then(
      (index) => {
        if (live) setEntries(index);
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [open, locale, attempt]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      lockScroll();
      lockedRef.current = true;
      inputRef.current?.select();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // An unmount mid-open (a locale switch remounts the layout) must not leave
  // the page locked.
  useEffect(
    () => () => {
      if (lockedRef.current) unlockScroll();
    },
    [],
  );

  const hits: SearchHit[] = useMemo(() => {
    if (!entries) return [];
    if (!query.trim()) {
      return entries
        .filter((entry) => entry.kind === "page")
        .map((entry) => ({ ...entry, snippet: "" }));
    }
    return search(entries, query);
  }, [entries, query]);

  // A new query starts at the top.
  useEffect(() => setActive(0), [query]);

  const optionId = (i: number) => `${listId}-${i}`;

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    // Result navigation belongs to the field; the close button keeps its
    // native Enter/Space behaviour, and composition keys belong to the IME.
    if (event.target !== inputRef.current || event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (hits.length === 0) return;
      const next = (active + (event.key === "ArrowDown" ? 1 : -1) + hits.length) % hits.length;
      setActive(next);
      document.getElementById(optionId(next))?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter") {
      event.preventDefault();
      document.getElementById(optionId(active))?.click();
    }
  };

  const onClosed = () => {
    if (lockedRef.current) unlockScroll();
    lockedRef.current = false;
    onClose();
  };

  const status = failed
    ? t("error")
    : entries === null
      ? t("loading")
      : query.trim() && hits.length === 0
        ? t("empty", { query: query.trim() })
        : null;

  return (
    <dialog
      ref={dialogRef}
      aria-label={t("dialogAria")}
      onClose={onClosed}
      // The field's result-navigation keys, heard as they bubble.
      onKeyDown={onKeyDown}
      onClick={(event) => {
        // A press on the backdrop is a press on the dialog itself.
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none bg-transparent p-4 pt-[12vh] backdrop:bg-black/35 backdrop:backdrop-blur-[2px]"
    >
      <div className="mx-auto flex max-h-[70vh] w-full max-w-[560px] flex-col overflow-hidden rounded-card border border-line bg-surface-raised text-fg shadow-lift">
        <div className="flex items-center gap-3 border-b border-line px-5 focus-within:border-fg-secondary">
          <Icon name="search" className="size-[18px] text-fg-tertiary" />
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded={hits.length > 0}
            aria-controls={listId}
            aria-activedescendant={hits.length > 0 ? optionId(active) : undefined}
            aria-autocomplete="list"
            aria-label={t("inputAria")}
            placeholder={t("placeholder")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            // The panel is the field's frame and the field is all it holds: no
            // ring of its own (inline, because the site's ring is unlayered
            // on purpose and outranks any utility), and no native clear
            // button beside the palette's own Esc.
            style={{ outline: "none" }}
            className="h-14 min-w-0 flex-1 bg-transparent text-body text-fg placeholder:text-fg-tertiary [&::-webkit-search-cancel-button]:appearance-none"
          />
          <kbd className="hidden shrink-0 font-mono text-meta text-fg-tertiary sm:block">esc</kbd>
          <button
            type="button"
            aria-label={t("closeAria")}
            onClick={() => dialogRef.current?.close()}
            className="ui-icon-action cursor-pointer sm:hidden"
          >
            <Icon name="close" className="size-[18px]" />
          </button>
        </div>

        {status && (
          <div className="space-y-3 px-5 py-6">
            <p
              role={failed ? "alert" : "status"}
              className="flex items-start gap-2 text-caption text-fg-secondary [overflow-wrap:anywhere]"
            >
              {!failed && entries === null && <Spinner />}
              {status}
            </p>
            {failed && (
              <Button size="small" onClick={() => setAttempt((value) => value + 1)}>
                {t("retry")}
              </Button>
            )}
          </div>
        )}

        <div
          id={listId}
          role="listbox"
          aria-busy={entries === null && !failed}
          aria-label={t("resultsAria")}
          data-lenis-prevent
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2"
        >
          {!query.trim() && hits.length > 0 && (
            <p
              role="presentation"
              className="px-5 pb-1 pt-2 font-mono text-meta uppercase tracking-meta text-fg-tertiary"
            >
              {t("suggestions")}
            </p>
          )}
          {hits.map((hit, i) => (
            <Link
              key={`${hit.kind}:${hit.href}:${i}`}
              id={optionId(i)}
              href={hit.href}
              role="option"
              aria-selected={i === active}
              tabIndex={-1}
              onMouseMove={() => setActive(i)}
              // The route veil prevents the click during document capture.
              // RouterLink skips onClick for that event, so close in capture too.
              onClickCapture={() => dialogRef.current?.close()}
              className={`mx-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl px-3 py-2.5 sm:flex-nowrap ${
                i === active ? "bg-fg/[0.06]" : ""
              }`}
            >
              <span className="min-w-0 font-mono text-meta uppercase tracking-meta text-accent [overflow-wrap:anywhere] sm:w-12 sm:shrink-0">
                {t(`kinds.${hit.kind}`)}
              </span>
              <span className="order-first min-w-0 basis-full sm:order-none sm:flex-1">
                <span className="block text-caption text-fg [overflow-wrap:anywhere]">
                  {hit.title || hit.snippet}
                </span>
                {hit.title && hit.snippet && (
                  <span className="mt-0.5 block truncate text-meta text-fg-tertiary">
                    {hit.snippet}
                  </span>
                )}
              </span>
              {hit.meta && (
                <span className="ms-auto min-w-0 text-end font-mono text-meta text-fg-tertiary tabular-nums [overflow-wrap:anywhere] sm:max-w-[40%]">
                  {hit.meta}
                </span>
              )}
            </Link>
          ))}
        </div>

        <p className="hidden border-t border-line px-5 py-2.5 font-mono text-meta text-fg-tertiary sm:block">
          {t("hint")}
        </p>
      </div>
    </dialog>
  );
}
