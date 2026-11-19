// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isTouchPointer, prefersTouchGuidance, TAP_MOVE_TOLERANCE_PX, useTouchGuidance } from "./inputMode.js";

const originalMatchMedia = Object.getOwnPropertyDescriptor(window, "matchMedia");

afterEach(() => {
  if (originalMatchMedia) Object.defineProperty(window, "matchMedia", originalMatchMedia);
  else Reflect.deleteProperty(window, "matchMedia");
});

function mockMatchMedia(matches: boolean) {
  const listeners = new Set<() => void>();
  const query = {
    matches,
    addEventListener: vi.fn((_type: string, listener: () => void) => { listeners.add(listener); }),
    removeEventListener: vi.fn((_type: string, listener: () => void) => { listeners.delete(listener); }),
  };
  Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn(() => query) });
  return { query, change(next: boolean) { query.matches = next; listeners.forEach((listener) => listener()); } };
}

describe("input mode helpers", () => {
  it("recognises only touch pointers", () => {
    expect(isTouchPointer({ pointerType: "touch" })).toBe(true);
    expect(isTouchPointer({ pointerType: "mouse" })).toBe(false);
    expect(isTouchPointer({ pointerType: "pen" })).toBe(false);
    expect(isTouchPointer({})).toBe(false);
  });

  it("shares a 10 px movement tolerance", () => {
    expect(TAP_MOVE_TOLERANCE_PX).toBe(10);
  });

  it("detects touch guidance from the hover and pointer media query", () => {
    mockMatchMedia(true);
    expect(prefersTouchGuidance()).toBe(true);
    mockMatchMedia(false);
    expect(prefersTouchGuidance()).toBe(false);
  });

  it("is false when matchMedia is unavailable", () => {
    Reflect.deleteProperty(window, "matchMedia");
    expect(prefersTouchGuidance()).toBe(false);
  });

  it("updates the hook when the media query changes and unsubscribes on unmount", () => {
    const media = mockMatchMedia(false);
    const { result, unmount } = renderHook(() => useTouchGuidance());
    expect(result.current).toBe(false);
    act(() => media.change(true));
    expect(result.current).toBe(true);
    unmount();
    expect(media.query.removeEventListener).toHaveBeenCalled();
  });
});
