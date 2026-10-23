// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useEnemyTurnPlayback } from "./useEnemyTurnPlayback.js";

afterEach(() => {
  vi.useRealTimers();
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
});
