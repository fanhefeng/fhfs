import { useEffect, useState } from "react";
import type { ViewportBounds } from "@/lib/viewport";

export function readVisualViewport(): ViewportBounds {
  const viewport = window.visualViewport;
  return viewport
    ? {
        top: viewport.offsetTop,
        left: viewport.offsetLeft,
        width: viewport.width,
        height: viewport.height,
      }
    : { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
}

/** Only observe while the surface is open; null keeps SSR and the first client render equal. */
export function useVisualViewport(enabled: boolean): ViewportBounds | null {
  const [bounds, setBounds] = useState<ViewportBounds | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const viewport = window.visualViewport;
    const update = () => {
      const next = readVisualViewport();
      setBounds((previous) =>
        previous &&
        previous.top === next.top &&
        previous.left === next.left &&
        previous.width === next.width &&
        previous.height === next.height
          ? previous
          : next,
      );
    };
    update();
    window.addEventListener("resize", update);
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    return () => {
      window.removeEventListener("resize", update);
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
    };
  }, [enabled]);
  return bounds;
}
