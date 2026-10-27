// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useEnemyTurnPlayback } from "./useEnemyTurnPlayback.js";

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
});

describe("useEnemyTurnPlayback", () => {
  it("waits one second after effects finish before advancing", () => {
    vi.useFakeTimers();
    const onAdvance = vi.fn();
    const { rerender } = renderHook((props) => useEnemyTurnPlayback(props), {
      initialProps: { active: true, stepKey: 0, paused: false, hasEffects: true, onAdvance },
    });

    act(() => { vi.advanceTimersByTime(2_000); });
    expect(onAdvance).not.toHaveBeenCalled();
    rerender({ active: true, stepKey: 0, paused: false, hasEffects: false, onAdvance });
    act(() => { vi.advanceTimersByTime(999); });
    expect(onAdvance).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(onAdvance).toHaveBeenCalledOnce();
  });

  it("preserves the remaining inter-action wait while paused", () => {
    vi.useFakeTimers();
    const onAdvance = vi.fn();
    const { rerender } = renderHook((props) => useEnemyTurnPlayback(props), {
      initialProps: { active: true, stepKey: 0, paused: false, hasEffects: false, onAdvance },
    });

    act(() => { vi.advanceTimersByTime(400); });
    rerender({ active: true, stepKey: 0, paused: true, hasEffects: false, onAdvance });
    act(() => { vi.advanceTimersByTime(5_000); });
    expect(onAdvance).not.toHaveBeenCalled();
    rerender({ active: true, stepKey: 0, paused: false, hasEffects: false, onAdvance });
    act(() => { vi.advanceTimersByTime(599); });
    expect(onAdvance).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(onAdvance).toHaveBeenCalledOnce();
  });

  it("pauses the intent countdown while the browser tab is hidden", () => {
    vi.useFakeTimers();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    const onAdvance = vi.fn();
    const { rerender } = renderHook((props) => useEnemyTurnPlayback(props), {
      initialProps: { active: true, stepKey: 0, paused: false, hasEffects: false, onAdvance },
    });
    act(() => { vi.advanceTimersByTime(5_000); });
    expect(onAdvance).not.toHaveBeenCalled();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    act(() => { document.dispatchEvent(new Event("visibilitychange")); });
    rerender({ active: true, stepKey: 0, paused: false, hasEffects: false, onAdvance });
    act(() => { vi.advanceTimersByTime(999); });
    expect(onAdvance).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(onAdvance).toHaveBeenCalledOnce();
  });
});
