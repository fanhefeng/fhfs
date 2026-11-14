/** Visible viewport coordinates, in CSS pixels relative to the layout viewport. */
export type ViewportBounds = { top: number; left: number; width: number; height: number };

/** Keep a popup on the side with enough visible room, without inventing a minimum height. */
export function selectPopupPlacement(
  anchor: { top: number; bottom: number },
  viewport: Pick<ViewportBounds, "top" | "height">,
  desiredHeight: number,
  gap = 6,
) {
  const above = Math.max(0, anchor.top - viewport.top - gap);
  const below = Math.max(0, viewport.top + viewport.height - anchor.bottom - gap);
  const upward = below < desiredHeight && above > below;
  return { upward, maxHeight: Math.min(desiredHeight, upward ? above : below) };
}
