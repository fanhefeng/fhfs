import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";

/** Split optional scenes into their own chunks; never download 3D during SSR. */
export default function clientLazy<P extends object>(
  load: () => Promise<{ default: ComponentType<P> } | ComponentType<P>>,
  options?: { ssr?: boolean; loading?: ComponentType },
): ComponentType<P> {
  const Lazy = lazy(async () => {
    const result = await load();
    return typeof result === "function"
      ? { default: result }
      : (result as { default: ComponentType<P> });
  });
  return function LazyScene(props: P) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const Loading = options?.loading;
    const fallback = Loading ? <Loading /> : null;
    if (options?.ssr === false && !mounted) return fallback;
    return (
      <Suspense fallback={fallback}>
        <Lazy {...props} />
      </Suspense>
    );
  };
}
