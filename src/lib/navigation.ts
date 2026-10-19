import {
  useLocation,
  useRouter as useTanstackRouter,
  notFound as routerNotFound,
  redirect as routerRedirect,
  isRedirect,
  isNotFound,
} from "@tanstack/react-router";
import { useMemo } from "react";

export function notFound(): never {
  throw routerNotFound();
}
export function redirect(href: string): never {
  throw routerRedirect({ href });
}
export function unstable_rethrow(error: unknown): void {
  if (isRedirect(error) || isNotFound(error)) throw error;
}
export function usePathname() {
  return useLocation({ select: (location) => location.pathname });
}
export function useRouter() {
  const router = useTanstackRouter();
  return useMemo(
    () => ({
      push: (href: string, options?: { scroll?: boolean }) => {
        void router.navigate({ to: href, resetScroll: options?.scroll !== false });
      },
      replace: (href: string, options?: { scroll?: boolean }) => {
        void router.navigate({ to: href, replace: true, resetScroll: options?.scroll !== false });
      },
      refresh: () => {
        void router.invalidate();
      },
      prefetch: (href: string) => {
        void router.preloadRoute({ to: href });
      },
      back: () => router.history.back(),
    }),
    [router],
  );
}
