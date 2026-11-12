import type { ComponentProps } from "react";

export function Badge({
  tone = "neutral",
  className = "",
  ...props
}: ComponentProps<"span"> & { tone?: "neutral" | "draft" | "success" | "error" }) {
  return <span {...props} className={`ui-badge ui-badge-${tone} ${className}`} />;
}
