/** Shared, browser-safe class contracts. No server modules or runtime state. */
export type ButtonTone = "primary" | "secondary" | "quiet" | "danger" | "choice";
export type ButtonSize = "default" | "small" | "icon";

export function buttonStyles({
  tone = "secondary",
  size = "default",
  className = "",
}: {
  tone?: ButtonTone;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return `ui-button ui-button-${tone} ui-button-${size} ${className}`;
}

export const fieldSkin = "ui-field rounded-chip border bg-surface-raised text-fg";
export const inputClass = `${fieldSkin} min-h-11 w-full min-w-0 px-3 py-2 placeholder:text-fg-tertiary`;
export const textareaClass = `${inputClass} block resize-y leading-relaxed`;
export const labelClass = "ui-label flex flex-wrap items-baseline gap-x-2";
export const hintClass = "ui-hint";
export const errorClass = "ui-error [overflow-wrap:anywhere]";
