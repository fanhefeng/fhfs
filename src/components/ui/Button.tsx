import type { ComponentProps } from "react";
import { buttonStyles, type ButtonSize, type ButtonTone } from "./controls";
import { Spinner } from "./Spinner";

/** A native button: callers retain submit, reset, refs and form semantics. */
export function Button({
  tone,
  size,
  busy = false,
  type = "button",
  disabled,
  className,
  children,
  ...props
}: ComponentProps<"button"> & {
  tone?: ButtonTone;
  size?: ButtonSize;
  busy?: boolean;
}) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={buttonStyles({ tone, size, className })}
    >
      {busy && <Spinner />}
      {children}
    </button>
  );
}
