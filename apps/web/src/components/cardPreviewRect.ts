export interface PreviewRect { left: number; top: number; width: number; height: number }
export interface AnchorRect { left: number; top: number; right: number; bottom: number; width: number; height: number }

export const HOVER_PREVIEW_SIZE = { width: 220, height: 320 } as const;

/**
 * Places the floating card preview next to the hovered element.
 * "scaled" keeps the hand behavior (1.5x the element), "fixed" uses a constant card size that shrinks only when the viewport is small.
 */
export function computePreviewRect(anchor: AnchorRect, viewport: { width: number; height: number }, mode: "scaled" | "fixed"): PreviewRect {
  let width: number;
  let height: number;
  if (mode === "fixed") {
    const scale = Math.max(0, Math.min(1, (viewport.width - 16) / HOVER_PREVIEW_SIZE.width, (viewport.height - 16) / HOVER_PREVIEW_SIZE.height));
    width = HOVER_PREVIEW_SIZE.width * scale;
    height = HOVER_PREVIEW_SIZE.height * scale;
  } else {
    width = Math.min(anchor.width * 1.5, Math.max(0, viewport.width - 16));
    height = Math.min(anchor.height * 1.5, Math.max(0, viewport.height - 16));
  }
  const preferredTop = anchor.top - height - 10 >= 8 ? anchor.top - height - 10 : anchor.bottom + 10;
  const left = Math.min(Math.max(8, anchor.left + anchor.width / 2 - width / 2), Math.max(8, viewport.width - width - 8));
  const top = Math.min(Math.max(8, preferredTop), Math.max(8, viewport.height - height - 8));
  return { left, top, width, height };
}
