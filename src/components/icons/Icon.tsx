import type { SVGProps } from "react";
import { iconAccents, iconPaths, type IconName } from "./paths";

export type { IconName } from "./paths";

type Props = Omit<SVGProps<SVGSVGElement>, "children" | "role" | "aria-label" | "aria-hidden"> & {
  name: IconName;
  /** Omit inside a labelled control; supply only for a standalone image. */
  label?: string;
  /** Use monochrome on a filled action or a visually busy surface. */
  monochrome?: boolean;
};

/** Shared geometry with the downloadable SVG set; inherits the theme's ink. */
export function Icon({ name, label, monochrome = false, className = "", ...props }: Props) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`fhf-icon shrink-0 ${className}`}
      focusable="false"
      {...props}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {iconPaths[name].map((d) => (
        <path key={d} d={d} />
      ))}
      {iconAccents[name]?.map((d) => (
        <path
          key={d}
          d={d}
          stroke={monochrome ? "currentColor" : "var(--icon-accent, var(--accent))"}
        />
      ))}
    </svg>
  );
}
