import { useMemo } from "react";
import { useLocale } from "use-intl";
import NativeLink, { type LinkProps } from "@/components/ui/Link";
import { usePathname as useRawPathname, useRouter as useRawRouter } from "@/lib/navigation";
function localized(href: string, locale: string) {
  if (
    !href.startsWith("/") ||
    href.startsWith("//") ||
    /^\/(zh|en)(?:\/|$)/.test(href) ||
    href.startsWith("/admin")
  )
    return href;
  return `/${locale}${href === "/" ? "" : href}`;
}
export function Link({ href, locale: target, ...props }: LinkProps & { locale?: string }) {
  const locale = useLocale();
  return <NativeLink {...props} href={localized(href, target ?? locale)} />;
}
export function usePathname() {
  return useRawPathname().replace(/^\/(zh|en)(?=\/|$)/, "") || "/";
}
export function useRouter() {
  const router = useRawRouter();
  const locale = useLocale();
  return useMemo(
    () => ({
      ...router,
      push: (href: string, options?: { locale?: string; scroll?: boolean }) =>
        router.push(localized(href, options?.locale ?? locale), options),
      replace: (href: string, options?: { locale?: string; scroll?: boolean }) =>
        router.replace(localized(href, options?.locale ?? locale), options),
    }),
    [router, locale],
  );
}
