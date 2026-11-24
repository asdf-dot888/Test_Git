// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { COMPACT_BOARD_QUERY, useCompactBoard } from "./useCompactBoard.js";

const originalMatchMedia = Object.getOwnPropertyDescriptor(window, "matchMedia");

afterEach(() => {
  if (originalMatchMedia) Object.defineProperty(window, "matchMedia", originalMatchMedia);
  else Reflect.deleteProperty(window, "matchMedia");
});

describe("useCompactBoard", () => {
  it("is false when matchMedia does not exist", () => {
    Reflect.deleteProperty(window, "matchMedia");
    const { result } = renderHook(() => useCompactBoard());
    expect(result.current).toBe(false);
  });

  it("follows the 760px query and its change events", () => {
    let listener: (() => void) | undefined;
    const query = { matches: false, addEventListener: vi.fn((_event: string, next: () => void) => { listener = next; }), removeEventListener: vi.fn() };
    Object.defineProperty(window, "matchMedia", { configurable: true, writable: true, value: vi.fn(() => query) });
    const { result, unmount } = renderHook(() => useCompactBoard());
    expect(window.matchMedia).toHaveBeenCalledWith(COMPACT_BOARD_QUERY);
    expect(result.current).toBe(false);
    query.matches = true;
    act(() => listener?.());
    expect(result.current).toBe(true);
    unmount();
    expect(query.removeEventListener).toHaveBeenCalled();
  });
});
