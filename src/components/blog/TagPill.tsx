import { Link } from "@/i18n/navigation";

export function TagPill({ tag, className }: { tag: string; className?: string }) {
  return (
    <Link
      href={`/blog/tags/${encodeURIComponent(tag)}`}
      className={`hit-ext relative font-mono text-meta uppercase tracking-meta text-fg-tertiary transition-colors duration-200 hover:text-accent focus-visible:text-accent ${className ?? ""}`}
    >
      #{tag}
    </Link>
  );
}
