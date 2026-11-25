/** The first element matching the selector list whose box is visible (non-zero width and height). */
export function findSpotlightTarget(selector: string): HTMLElement | null {
  for (const element of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return element;
  }
  return null;
}
