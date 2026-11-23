import { routing, type Locale } from "@/i18n/routing";

function isLocale(value: string | undefined): value is Locale {
  return value === "zh" || value === "en";
}

/** Compatibility for the two supported languages, not a general best-fit matcher. */
function preferredLocale(headers: Headers): Locale {
  const cookie = headers.get("cookie");
  const saved = cookie?.match(/(?:^|;)[ \t]*NEXT_LOCALE=(zh|en)(?=[ \t]*(?:;|$))/)?.[1];
  if (isLocale(saved)) return saved;

  const accept = headers.get("accept-language");
  let locale: Locale = routing.defaultLocale;
  let best = 0;
  if (!accept || accept.length > 2048) return locale;
  for (const term of accept.split(",")) {
    const match =
      /^(zh|en)(?:-[a-z0-9]{1,8})*(?:[ \t]*;[ \t]*q=(0(?:\.\d{0,3})?|1(?:\.0{0,3})?))?$/i.exec(
        term.trim(),
      );
    const language = match?.[1]?.toLowerCase();
    const quality = match?.[2] === undefined ? 1 : Number(match[2]);
    if (isLocale(language) && quality > best) {
      locale = language;
      best = quality;
    }
  }
  return locale;
}

/** Recognize exact paths as delivered by Request. Do not decode or glob them. */
export function legacyPageRedirect(request: Request): Response | undefined {
  if (request.method !== "GET" && request.method !== "HEAD") return;
  const url = new URL(request.url);
  let destination: string;
  switch (url.pathname) {
    case "/software":
    case "/lab/grove":
      destination = url.pathname;
      break;
    case "/blog/notes": {
      const section = url.searchParams.get("section");
      // The localized notes index redirects again and drops the search string.
      destination = section === "life" || section === "writing" ? "/life" : "/blog";
      break;
    }
    default:
      return;
  }
  return new Response(null, {
    status: 307,
    headers: {
      location: `/${preferredLocale(request.headers)}${destination}${url.search}`,
      "cache-control": "private, no-store",
      vary: "Accept-Language, Cookie",
    },
  });
}
