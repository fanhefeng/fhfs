"use client";

import { getRouteApi } from "@tanstack/react-router";
import { useState, type RefObject } from "react";
import { useLocale, useTranslations } from "use-intl";
import { Icon } from "@/components/icons/Icon";
import { buttonStyles } from "@/components/ui/controls";
import { site } from "@/config/site";
import { htmlLang } from "@/i18n/routing";
import type { ShareTarget } from "@/lib/client/shareCard";
import { ShareDialog } from "./ShareDialog";

const localeRoute = getRouteApi("/$locale");

export function ShareButton({
  target,
  className,
  label,
  iconOnly,
  returnFocus,
  onOpen,
}: {
  target: ShareTarget;
  className?: string;
  label?: string;
  iconOnly?: boolean;
  returnFocus?: RefObject<HTMLButtonElement | null>;
  onOpen?: () => void;
}) {
  const preview = localeRoute.useLoaderData({ select: (data) => data.preview });
  const t = useTranslations("share");
  const lang = htmlLang(useLocale());
  const [selection, setSelection] = useState<{
    target: ShareTarget;
    opener: HTMLButtonElement;
  } | null>(null);
  if (selection && selection.target.path !== target.path) setSelection(null);
  if (preview) return null;

  return (
    <>
      <button
        type="button"
        lang={lang}
        aria-label={label ?? t("open")}
        aria-haspopup="dialog"
        title={iconOnly ? (label ?? t("open")) : undefined}
        className={iconOnly ? className : buttonStyles({ tone: "quiet", size: "small", className })}
        onClick={(event) => {
          setSelection({ target, opener: returnFocus?.current ?? event.currentTarget });
          onOpen?.();
        }}
      >
        <Icon name="share" className="size-[18px]" />
        {!iconOnly && t("open")}
      </button>
      {selection && (
        <ShareDialog
          target={selection.target}
          url={new URL(selection.target.path, site.url).href}
          lang={lang}
          onClose={() => {
            setSelection(null);
            if (selection.opener.isConnected) selection.opener.focus({ preventScroll: true });
          }}
        />
      )}
    </>
  );
}
