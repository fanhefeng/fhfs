import { ImageResponse, type ImageResponseOptions } from "cf-workers-og/node";
import type { ReactNode } from "react";

/** Use only the supplied local fonts; no provider or legacy site is contacted. */
export async function renderOgImage(node: ReactNode, options: ImageResponseOptions) {
  return ImageResponse.create(node, options);
}
