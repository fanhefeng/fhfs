import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/fx/Reveal";

/**
 * The index the blog, the secrets and the board all read as: a year in mono
 * over a ruled list, one line per piece. These three used to carry their own
 * copies of this markup, and the copies had begun to disagree (the board's
 * year sat 4px closer to its list). The rows differ; the frame is this.
 */
export function YearSection({
  label,
  heading,
  children,
}: {
  /** Names the section for a screen reader — "Posts from 2024". */
  label: string;
  heading: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-label={label} className="mb-14 last:mb-0">
      <h2 className="mb-3 font-mono text-meta uppercase tracking-meta text-fg-tertiary tabular-nums">
        {heading}
      </h2>
      <Reveal as="ol" role="list" stagger={0.05} className="border-t border-line">
        {children}
      </Reveal>
    </section>
  );
}

/**
 * One line of such an index: the title on the left, mono notes and the date
 * flush right. No card, no summary, no thumbnail — the list is meant to be
 * read like a table of contents. Hovering (or keyboard-focusing) draws an
 * amber underline and floats `detail` in beside the date; both are
 * transform/opacity only, so a long list stays cheap to render. On a phone,
 * notes and date sit below the title and stay visible. The waiting is only
 * for a wider screen with a pointer that can hover.
 */
export function IndexRow({
  href,
  title,
  titleLang,
  date,
  tag,
  detail,
}: {
  href: string;
  title: string;
  /** Set on a fallback row — the other language's title in this locale's
   *  list — or a screen reader pronounces 中文 with English rules. */
  titleLang?: string;
  /** `YYYY-MM-DD`; the row prints the month and day, the section the year. */
  date: string | null;
  /** Always shown, in the accent: what kind of piece this is. */
  tag?: ReactNode;
  /** Reading time: always visible on phones and touch screens. */
  detail?: ReactNode;
}) {
  const [, month, day] = date?.split("-") ?? [];
  return (
    <li className="border-b border-line last:border-b-0">
      <Link
        href={href}
        className="group flex min-h-11 flex-col items-start gap-1.5 py-3.5 sm:flex-row sm:items-baseline sm:gap-8"
      >
        <span
          lang={titleLang}
          className="relative min-w-0 max-w-full text-heading font-medium text-fg [overflow-wrap:anywhere] sm:flex-1"
        >
          {title}
          {/* Underline as a scaled hairline: transform-only, no reflow. */}
          <span
            aria-hidden
            className="absolute inset-x-0 -bottom-0.5 block h-px origin-left scale-x-0 bg-accent transition-transform duration-[250ms] ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100"
          />
        </span>
        <span className="flex max-w-full shrink-0 flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-meta uppercase tracking-meta text-fg-tertiary">
          {tag && <span className="text-accent">{tag}</span>}
          {detail && (
            <span className="inline-block transition duration-[250ms] ease-out sm:[@media(hover:hover)]:translate-x-1 sm:[@media(hover:hover)]:opacity-0 sm:[@media(hover:hover)]:group-hover:translate-x-0 sm:[@media(hover:hover)]:group-hover:opacity-100 sm:[@media(hover:hover)]:group-focus-visible:translate-x-0 sm:[@media(hover:hover)]:group-focus-visible:opacity-100">
              {detail}
            </span>
          )}
          {date && (
            <time dateTime={date} className="tabular-nums">
              {month}.{day}
            </time>
          )}
        </span>
      </Link>
    </li>
  );
}
