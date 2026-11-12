/**
 * The house rule a section wants said before you start typing in it — which
 * field may not be invented, what a status word promises, where a value is
 * read from.
 *
 * Distinct from the section's blurb in the header (that says *what* this page
 * changes) and quiet enough to skip once known: a rule, not a warning.
 *
 * No "use client": this renders inside server pages, and has no behaviour.
 */
export function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 max-w-[72ch] space-y-2 rounded-chip bg-surface px-3 py-2.5 text-caption text-fg-secondary sm:mb-5 [&_code]:font-mono [&_code]:text-fg">
      {children}
    </div>
  );
}
