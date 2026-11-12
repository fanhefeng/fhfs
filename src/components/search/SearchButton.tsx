"use client";

import { Icon } from "@/components/icons/Icon";
import { useTranslations } from "use-intl";
import { openSearch } from "@/lib/client/search";

/** The magnifier in the island and the menu: it only asks; `SearchLauncher` answers. */
export function SearchButton({ className = "" }: { className?: string }) {
  const t = useTranslations("search");
  return (
    <button
      type="button"
      onClick={openSearch}
      aria-label={t("buttonAria")}
      title={t("buttonTitle")}
      className={`ui-icon-action cursor-pointer ${className}`}
    >
      <Icon name="search" className="size-[18px]" />
    </button>
  );
}
