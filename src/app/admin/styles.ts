/** Compatibility names for the workbench. All control skins come from the
 * browser-safe shared UI module; never import AdminChrome or server modules. */
import { buttonStyles } from "@/components/ui/controls";
export {
  fieldSkin,
  inputClass,
  textareaClass,
  labelClass,
  hintClass,
  errorClass,
} from "@/components/ui/controls";

export const monoClass = "font-mono text-caption";
export const buttonClass = buttonStyles({ tone: "primary" });
export const ghostButtonClass = buttonStyles();
export const iconButtonClass = buttonStyles({ size: "icon" });
export const choiceButtonClass = buttonStyles({ tone: "choice" });
export const dangerButtonClass = buttonStyles({ tone: "danger" });

export const listRowClass =
  "group min-h-14 rounded-chip px-3 py-3 transition-colors hover:bg-surface focus-visible:bg-surface";

export const summaryClass =
  "flex min-h-11 list-none flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-chip border border-line px-3 py-2 hover:bg-surface focus-visible:bg-surface [&::-webkit-details-marker]:hidden";

/** A surface a step above the page: form panels, list rows, dashboard cards. */
export const cardClass = "rounded-card border border-line bg-surface-raised";

/** The mono kicker used for group names, counts and timestamps. */
export const metaClass = "font-mono text-meta uppercase tracking-meta text-fg-tertiary";

export const sectionHeadingClass = "text-heading font-semibold text-fg";

export const pageWidthClass =
  "mx-auto w-full max-w-4xl px-4 pt-5 pb-10 sm:px-8 sm:pt-8 lg:px-10 lg:pt-9";
