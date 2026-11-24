import type { Locale } from "@/i18n/routing";
import { validKey } from "@/lib/forms";

export type ArticleShareTarget = { url: string; title?: string; text?: string };

type ShareableArticle = {
  locale: Locale;
  slug: string;
  title: string;
  summary: string;
  isFallback: boolean;
  snapshotAt?: string;
};

/** The displayed edition owns its canonical link. Preview is never shareable. */
export function articleShareTarget(
  origin: string,
  article: ShareableArticle,
  preview: boolean,
): ArticleShareTarget | null {
  if (preview || !validKey(article.slug)) return null;
  const url = `${origin}/${article.locale}/blog/${article.slug}`;
  // An older public snapshot may contain withdrawn copy. A translated fallback
  // also shares only the original edition's URL, not secondary-page copy.
  if (article.snapshotAt || article.isFallback) return { url };
  return { url, title: article.title, text: article.summary };
}

export type ArticleShareResult = "shared" | "copied" | "cancelled" | "manual";

type SharePort = {
  share?: (data: ArticleShareTarget) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
};

export async function shareArticle(
  target: ArticleShareTarget,
  port: SharePort,
  isCurrent: () => boolean = () => true,
): Promise<ArticleShareResult> {
  if (!isCurrent()) return "cancelled";
  try {
    if (port.share) {
      await port.share(target);
      return isCurrent() ? "shared" : "cancelled";
    }
  } catch (error) {
    if (error && typeof error === "object" && "name" in error && error.name === "AbortError")
      return "cancelled";
  }

  // Native sharing can fail long after the article or privilege state changes.
  if (!isCurrent()) return "cancelled";
  try {
    if (port.clipboard) {
      await port.clipboard.writeText(target.url);
      return isCurrent() ? "copied" : "cancelled";
    }
  } catch {
    // Clipboard permission may be absent, even in a secure context.
  }
  return isCurrent() ? "manual" : "cancelled";
}
