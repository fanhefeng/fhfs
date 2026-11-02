import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { useLocale } from "use-intl";
import { type Locale } from "@/i18n/routing";
import { registerSiteTools, type WebMcpRegistry } from "@/lib/client/webmcp";

/** Public-page enhancement: no UI, model API keys, server code or eager index fetch. */
export function WebMCP({ enabled }: { enabled: boolean }) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  useEffect(() => {
    if (!enabled) return;
    const registry = (document as Document & { readonly modelContext?: WebMcpRegistry })
      .modelContext;
    return registerSiteTools(registry, {
      locale,
      async navigate(path, signal) {
        signal?.throwIfAborted();
        await router.navigate({ to: path });
        if (
          router.state.matches.some(
            (match) => match.status === "error" || match.status === "notFound",
          )
        )
          throw new Error("Page unavailable");
      },
    });
  }, [enabled, locale, router]);
  return null;
}
