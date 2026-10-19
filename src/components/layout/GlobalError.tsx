import { useLocation } from "@tanstack/react-router";
import { ERROR_COPY } from "@/lib/errorCopy";

export function GlobalError({ reset }: { reset: () => void }) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const locale = pathname.startsWith("/en") ? "en" : "zh";
  const copy = ERROR_COPY[locale];
  return (
    <main className="mx-auto w-full max-w-xl px-6 py-32">
      <p className="font-mono text-meta text-fg-secondary">{copy.kicker}</p>
      <h1 className="mt-4 text-title">{copy.title}</h1>
      <p className="mt-4 text-body">{copy.description}</p>
      <div className="mt-8 flex gap-6">
        <button type="button" onClick={reset}>
          {copy.retry}
        </button>
        <a href={`/${locale}`}>{copy.backHome}</a>
      </div>
    </main>
  );
}
