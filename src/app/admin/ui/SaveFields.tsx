import type { ReactNode } from "react";

/**
 * Keep a pending save's snapshot stable until its server refresh or redirect
 * completes. Native fieldset disabling reaches custom controls' buttons;
 * inert also blocks an already-open custom listbox's non-native options.
 * Each child's own disabled/read-only state survives when it unlocks.
 * FormData is collected by useSaveAction before this becomes disabled.
 * SaveControls stays outside so progress and errors remain accessible.
 */
export function SaveFields({
  pending,
  className = "",
  children,
}: {
  pending: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <fieldset
      disabled={pending}
      inert={pending}
      aria-label="编辑内容"
      aria-busy={pending || undefined}
      className={`m-0 min-w-0 border-0 p-0 ${className}`}
    >
      {children}
    </fieldset>
  );
}
