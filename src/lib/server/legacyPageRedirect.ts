import { routing, type Locale } from "@/i18n/routing";
import { validKey } from "@/lib/forms";

const retiredPages = new Map([
  ["/grove", "/lab/grove"],
  ["/portfolio", "/software"],
  ["/lab/grove-stage", "/lab/approach"],
  ["/lab/album", "/lab"],
  ["/lab/aurora", "/lab"],
  ["/lab/grain", "/lab"],
  ["/odyssey", "/films/odyssey"],
]);

const publicIndexes = new Set([
  "",
  "about",
  "blog",
  "films",
  "idols",
  "intro",
  "lab",
  "life",
  "moments",
  "resume",
  "secrets",
  "software",
]);
const publicDetailSections = new Set(["blog", "films", "idols", "lab", "secrets"]);

function isUnprefixedPublicPage(pathname: string): boolean {
  const [, section = "", key, detail, extra] = pathname.split("/");
  if (key === undefined) return publicIndexes.has(section);
  if (detail === undefined) return publicDetailSections.has(section) && validKey(key);
  if (section !== "blog" || extra !== undefined) return false;
  if (key === "notes") return validKey(detail);
  return key === "tags" && /^(?:[^.%/]|%[0-9a-f]{2})+$/i.test(detail);
}

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
  const { pathname, search } = url;
  const language = pathname.split("/")[1];
  if (isLocale(language)) {
    const destination = retiredPages.get(pathname.slice(language.length + 1));
    if (!destination) return;
    return new Response(null, {
      status: 308,
      headers: { location: `/${language}${destination}${search}` },
    });
  }

  let destination = retiredPages.get(pathname);
  if (pathname === "/blog/notes") {
    // Skip the localized notes index so it cannot drop the saved query.
    const section = url.searchParams.get("section");
    destination = section === "life" || section === "writing" ? "/life" : "/blog";
  }
  if (destination === undefined && !isUnprefixedPublicPage(pathname)) return;
  destination ??= pathname === "/" ? "" : pathname;
  return new Response(null, {
    status: 307,
    headers: {
      location: `/${preferredLocale(request.headers)}${destination}${search}`,
      "cache-control": "private, no-store",
      vary: "Accept-Language, Cookie",
    },
  });
}
