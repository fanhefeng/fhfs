import { useCallback, useEffect, useState } from "react";
import { useRouter } from "@/lib/navigation";

/**
 * A filter that lives in the address bar — `?key=value`.
 *
 * Read after hydration so server HTML stays unfiltered. Write through the
 * router with scroll disabled: native replaceState is observed as a navigation
 * too, but cannot tell TanStack to keep the reader beside the filter.
 *
 * Replace, not push: a filter is a view of the page, not a place
 * in it, and five chips pressed should not be five presses of Back to leave.
 * What this buys is the other three — a reload, a shared link and a return
 * through the history all come back to the same view.
 *
 * `allowed` is what the page actually offers: anything else in the query — an
 * old link, a typo — is no choice at all, rather than an empty list.
 */
export function useUrlChoice(
  key: string,
  allowed: readonly string[],
): [string | null, (value: string | null) => void] {
  const router = useRouter();
  const [choice, setChoice] = useState<string | null>(null);
  const allowedKey = allowed.join("\n");

  useEffect(() => {
    const read = () => {
      const value = new URLSearchParams(window.location.search).get(key);
      setChoice(value !== null && allowedKey.split("\n").includes(value) ? value : null);
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, [key, allowedKey]);

  const choose = useCallback(
    (value: string | null) => {
      setChoice(value);
      const url = new URL(window.location.href);
      if (value === null) url.searchParams.delete(key);
      else url.searchParams.set(key, value);
      router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
    },
    [key, router],
  );

  return [choice, choose];
}
