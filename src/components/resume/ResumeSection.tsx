/* oxlint-disable jsx-a11y/no-redundant-roles -- WebKit needs explicit list roles when Tailwind removes markers. */
import type { ReactNode } from "react";
import { Reveal } from "@/components/fx/Reveal";
import { Rich } from "./Rich";

/**
 * A single reading column: the heading names the group, with room above
 * it and a tighter gap before its content. Screen and paper share the same
 * reading order, without reserving a separate rail for section labels.
 */
export function ResumeSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Reveal as="section" className="mt-12 border-t border-line pt-8 sm:mt-14 print:mt-4 print:pt-2">
      <h2 className="text-heading font-semibold text-fg">{title}</h2>
      <div className="mt-5 min-w-0 print:mt-2">{children}</div>
    </Reveal>
  );
}

/**
 * The résumé's list: a short hairline for a marker rather than a disc, hung
 * in the margin so the text keeps one left edge. Lines carry inline
 * emphasis (see Rich).
 */
export function Bullets({ items, className = "" }: { items: string[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <ul
      role="list"
      className={`space-y-3 text-body text-fg-secondary print:space-y-1 ${className}`}
    >
      {items.map((item, i) => (
        <li
          key={i}
          className="relative pl-5 before:absolute before:left-0 before:top-[0.85em] before:h-px before:w-2.5 before:bg-fg-tertiary print:break-inside-avoid"
        >
          <Rich text={item} />
        </li>
      ))}
    </ul>
  );
}
