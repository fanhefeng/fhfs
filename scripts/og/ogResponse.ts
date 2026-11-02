import satori, { type SatoriOptions } from "satori";
import { Resvg } from "@resvg/resvg-js";
import type { ReactNode } from "react";

/** Use only the supplied local fonts; no provider or legacy site is contacted. */
export async function renderOgImage(node: ReactNode, options: SatoriOptions) {
  const svg = await satori(node, options);
  const png = new Resvg(svg, { font: { loadSystemFonts: false } }).render().asPng();
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
}
