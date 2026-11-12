"use client";

import Link from "@/components/ui/Link";
import { Icon } from "@/components/icons/Icon";
import { usePathname } from "@/lib/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { logout } from "./login/actions";
import { SECTION_GROUPS, type SectionCounts } from "./sections";
import { ghostButtonClass, metaClass } from "./styles";
import styles from "./admin.module.css";

/**
 * The standing table of contents, grouped the way the front of the site is.
 *
 * A dozen sections in one flat row of links (what the header used to be) told
 * you nothing about where you were; four named groups of three or four tell you
 * both that and what else lives next door. The count beside each one is read in
 * a single statement for the whole sidebar (`./counts`), so this costs one
 * round trip per page, not twelve.
 *
 * Below `lg` the same navigation opens in a modal drawer.
 *
 * `counts` is left out by the loading state (`./loading.tsx`), which draws the
 * same sidebar before the page has read anything: no numbers rather than a
 * column of zeros that would say every table had emptied.
 */
export function AdminSidebar({ counts }: { counts?: SectionCounts }) {
  const pathname = usePathname();
  const drawer = useRef<HTMLDialogElement>(null);
  const drawerId = useId();
  const [open, setOpen] = useState(false);
  const signOutAction = useServerFn(logout);

  useEffect(() => drawer.current?.close(), [pathname]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 64rem)");
    const closeAtDesktop = () => {
      if (desktop.matches) drawer.current?.close();
    };
    desktop.addEventListener("change", closeAtDesktop);
    return () => desktop.removeEventListener("change", closeAtDesktop);
  }, []);

  const current = SECTION_GROUPS.flatMap((group) => group.sections).find(
    (section) => pathname === section.href || pathname.startsWith(`${section.href}/`),
  );

  const nav = (
    <nav aria-label="内容板块" className="space-y-4">
      <Link
        href="/admin"
        aria-current={pathname === "/admin" || pathname === "/admin/" ? "page" : undefined}
        className="flex min-h-11 items-center gap-2.5 rounded-chip px-3 text-caption text-fg-secondary transition-colors hover:bg-surface hover:text-fg aria-[current]:bg-surface aria-[current]:font-semibold aria-[current]:text-fg"
      >
        <Icon name="overview" className="size-[18px]" />
        内容总览
      </Link>
      {SECTION_GROUPS.map((group) => (
        <div key={group.id}>
          <h2 className={`${metaClass} px-3`}>{group.label}</h2>
          <ul className="mt-1 space-y-0.5">
            {group.sections.map((section) => {
              const isCurrent = section.href === current?.href;
              return (
                <li key={section.href}>
                  <Link
                    href={section.href}
                    aria-current={isCurrent ? "page" : undefined}
                    onClick={(event) => {
                      if (!event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
                        drawer.current?.close();
                      }
                    }}
                    className={`relative flex min-h-11 items-center gap-2.5 rounded-chip px-3 text-caption transition-colors ${
                      isCurrent
                        ? "bg-surface font-semibold text-fg"
                        : "text-fg-secondary hover:bg-surface/60 hover:text-fg"
                    }`}
                  >
                    <Icon
                      name={section.icon}
                      className={`size-[18px] ${isCurrent ? "text-accent" : ""}`}
                    />
                    <span className="flex-1 truncate">{section.label}</span>
                    {/* With its unit: a bare "0" beside 站点文案 read as "no copy",
                        when it counts the lines edited away from the files. */}
                    {counts?.[section.href] !== undefined && (
                      <span className="font-mono text-meta text-fg-tertiary tabular-nums">
                        {counts[section.href]}
                        <span className="ml-1 font-sans">{section.unit}</span>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const brand = (
    <Link
      href="/admin"
      className="inline-flex items-center gap-2 text-body font-semibold tracking-tight text-fg transition-colors hover:text-accent"
    >
      <Icon name="brand" className="size-6" />
      fhf<span className="hidden sm:inline"> · 内容管理</span>
    </Link>
  );

  const signOut = (
    <form action={signOutAction}>
      <button
        type="submit"
        className="min-h-11 min-w-11 rounded-chip px-2 text-caption text-fg-secondary transition-colors hover:bg-surface hover:text-fg"
      >
        退出
      </button>
    </form>
  );

  return (
    <>
      {/* ≥lg: the column that is always there. */}
      <aside className="hidden lg:flex lg:h-dvh lg:sticky lg:top-0 lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-line lg:bg-bg">
        <div className="flex items-center justify-between px-6 py-3">
          {brand}
          {signOut}
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-6">{nav}</div>
        <p className="border-t border-line px-6 py-4 text-caption text-fg-tertiary">
          保存后更新，前台最多延迟 30 秒。
        </p>
      </aside>

      {/* <lg: a bar, and the same nav behind it. */}
      <div className="sticky top-0 z-40 flex items-center gap-2 border-b border-line bg-bg px-4 py-1.5 lg:hidden">
        <button
          type="button"
          onClick={(event) => {
            event.currentTarget.focus({ preventScroll: true });
            drawer.current?.showModal();
            setOpen(true);
          }}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={drawerId}
          className={ghostButtonClass}
        >
          <Icon name="menu" className="size-4" />
          板块
        </button>
        {brand}
        <span className="text-caption text-fg-tertiary">/</span>
        <span className="flex-1 truncate text-caption text-fg-secondary">
          {current?.label ?? "内容"}
        </span>
        {signOut}
      </div>

      {/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events -- Escape and the close button already provide keyboard dismissal. */}
      <dialog
        ref={drawer}
        id={drawerId}
        aria-labelledby={`${drawerId}-title`}
        onClose={() => setOpen(Boolean(drawer.current?.open))}
        onClick={(event) => {
          if (event.target === event.currentTarget) drawer.current?.close();
        }}
        className={`${styles.drawer} fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none border-0 bg-transparent p-0 text-fg backdrop:bg-black/40`}
      >
        <div className="flex max-h-[85dvh] flex-col rounded-b-card border-b border-line bg-bg shadow-lift">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-2">
            <h2 id={`${drawerId}-title`} className="text-body font-semibold">
              内容板块
            </h2>
            <button
              type="button"
              className={ghostButtonClass}
              onClick={() => drawer.current?.close()}
            >
              关闭
            </button>
          </div>
          <div className="overflow-y-auto overscroll-contain px-3 py-4">{nav}</div>
        </div>
      </dialog>
    </>
  );
}
