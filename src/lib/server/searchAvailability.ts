import "@tanstack/react-start/server-only";
import { getDefaultMessages, getMessages } from "@/i18n/server";
import type { Locale } from "@/i18n/routing";
import { bypassContentCache, withSearchTransportSignal } from "./cacheScope";
import { getSearchContent } from "./content";
import { PublicReadError } from "./publicRead";
import { snapshotContent } from "./snapshotContent";
import { readPublicSnapshot } from "./snapshotSource";

// Preserve slow successful reads at 18s, but leave room to send response
// headers before the independent 20s uptime probe fires.
export const SEARCH_RESPONSE_BUDGET_MS = 18_500;
const DEADLINE = Symbol("search response deadline");

type SearchResponse = {
  content: Awaited<ReturnType<typeof getSearchContent>>;
  messages: Awaited<ReturnType<typeof getMessages>>;
  snapshotAt?: string;
};

export async function loadSearchResponse(
  locale: Locale,
  requestSignal: AbortSignal,
): Promise<SearchResponse | null> {
  if (bypassContentCache()) {
    const [content, messages] = await Promise.all([getSearchContent(locale), getMessages(locale)]);
    return { content, messages };
  }

  const transport = new AbortController();
  const signal = AbortSignal.any([transport.signal, requestSignal]);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<typeof DEADLINE>((resolve) => {
    timer = setTimeout(() => resolve(DEADLINE), SEARCH_RESPONSE_BUDGET_MS);
  });
  let liveContent: Awaited<ReturnType<typeof getSearchContent>> | undefined;
  try {
    const live = withSearchTransportSignal(signal, () =>
      Promise.all([
        getSearchContent(locale).then((content) => (liveContent = content)),
        getMessages(locale),
      ]),
    );
    const result = await Promise.race([
      live.then(
        ([content, messages]) => ({ content, messages }),
        async (error: unknown) => {
          if (!(error instanceof PublicReadError) || !error.snapshotEligible) throw error;
          // A known database outage must not also wait for database-backed copy.
          transport.abort();
          const [snapshot, messages] = await Promise.all([
            readPublicSnapshot(),
            getDefaultMessages(locale),
          ]);
          return {
            content: snapshotContent.search(snapshot, locale),
            messages,
            snapshotAt: snapshot.publishedAt,
          };
        },
      ),
      deadline,
    ]);
    if (result !== DEADLINE) return result;
    if (liveContent) return { content: liveContent, messages: await getDefaultMessages(locale) };
    // If neither live data nor a validated snapshot is ready by the deadline,
    // fail explicitly instead of returning an empty index as a success.
    return null;
  } finally {
    clearTimeout(timer);
    transport.abort();
  }
}
