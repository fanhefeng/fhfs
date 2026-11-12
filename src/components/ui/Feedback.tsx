import type { ComponentProps } from "react";
import { Icon } from "@/components/icons/Icon";

/** Inline, persistent feedback. Error text supplies recovery, not just colour. */
export function Feedback({
  tone = "info",
  className = "",
  children,
  ...props
}: ComponentProps<"span"> & { tone?: "info" | "success" | "error" }) {
  return (
    <span
      role={tone === "error" ? "alert" : "status"}
      {...props}
      className={`ui-feedback ui-feedback-${tone} ${className}`}
    >
      <Icon
        name={tone === "error" ? "warning" : tone === "success" ? "check" : "info"}
        monochrome
        className="size-4"
      />
      <span className="min-w-0">{children}</span>
    </span>
  );
}
