import { Link } from "@/i18n/navigation";

export function TagPill({ tag, className }: { tag: string; className?: string }) {
  return (
    <Link
      href={`/blog/tags/${encodeURIComponent(tag)}`}
      className={`relative inline-flex min-h-11 min-w-11 max-w-full items-center font-mono text-meta uppercase tracking-meta text-fg-tertiary transition-colors duration-200 [overflow-wrap:anywhere] hover:text-accent focus-visible:text-accent ${className ?? ""}`}
    >
      #{tag}
    </Link>
  );
}
