import { useEffect, useState } from "react";

/** A finger or stylus-free touch contact; mouse and pen keep the desktop behavior. */
export function isTouchPointer(event: { pointerType?: string }): boolean {
  return event.pointerType === "touch";
}

/** Movement (px) below which a touch is still a tap; the touch drag uses the same value as its start threshold. */
export const TAP_MOVE_TOLERANCE_PX = 10;

const TOUCH_GUIDANCE_QUERY = "(hover: none) and (pointer: coarse)";

/** True when the primary input is a finger, so instructions should talk about tapping and dragging. */
export function prefersTouchGuidance(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(TOUCH_GUIDANCE_QUERY).matches === true;
}

export function useTouchGuidance(): boolean {
  const [touch, setTouch] = useState(prefersTouchGuidance);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const query = window.matchMedia(TOUCH_GUIDANCE_QUERY);
    const update = () => setTouch(query.matches === true);
    update();
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", update);
      return () => query.removeEventListener("change", update);
    }
    return undefined;
  }, []);
  return touch;
}
