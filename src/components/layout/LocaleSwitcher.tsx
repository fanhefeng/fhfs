"use client";

import { useLocale, useTranslations } from "use-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

/**
 * zh ⇄ en toggle, compact enough to sit inside the island tray and the
 * FullNav footer row. The visible label names the *target* language
 * (common.localeSwitch); the aria label spells out the direction.
 *
 * Scroll position survives the swap — router.replace with scroll: false is
 * the locale-switch contract. There is deliberately no transition around it:
 * the words swap in place, and RouteTransition ignores the path change
 * because no veil is up.
 *
 * The query rides along: /software and /moments keep their filter in it
 * (`useUrlChoice`), and switching language should not clear what the reader
 * chose. Read from `location` at the click, not with `useSearchParams`, which
 * would push every page with the switcher out of static rendering.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const other = locale === "zh" ? "en" : "zh";

  return (
    <button
      type="button"
      onClick={() =>
        router.replace(`${pathname}${window.location.search}${window.location.hash}`, {
          locale: other,
          scroll: false,
        })
      }
      aria-label={t("localeSwitchAria")}
      className={`inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full px-2.5 text-caption font-medium text-fg-secondary transition-colors hover:bg-surface hover:text-fg ${className ?? ""}`}
    >
      {t("localeSwitch")}
    </button>
  );
}
