// @vitest-environment jsdom
import { useCallback, useState } from "react";
import { act, renderHook } from "@testing-library/react";
import { createRun, type RunState, type TurnTimerState } from "@board-game/game-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTurnTimer } from "./useTurnTimer.js";

const BASE_TIME = 100_000;

function setup(initialRun = createRun(61), initiallyPaused = false) {
  const onTimeout = vi.fn();
  const result = renderHook(({ paused }: { paused: boolean }) => {
    const [run, setRun] = useState<RunState | null>(initialRun);
    const onTimerChange = useCallback((timer: TurnTimerState | undefined) => {
      setRun((current) => {
        if (!current) return current;
        const next = { ...current };
        if (timer) next.turnTimer = timer;
        else delete next.turnTimer;
        return next;
      });
    }, []);
    const timer = useTurnTimer({ run, paused, onTimerChange, onTimeout });
    return { run, setRun, timer };
  }, { initialProps: { paused: initiallyPaused } });
  return { ...result, onTimeout };
}

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
});

describe("useTurnTimer", () => {
  it("keeps no clock while the turn order is still to be picked and starts one afterwards", () => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
    const { result } = setup(createRun(62, "warrior", "normal", { pickTurnOrder: true }));
    expect(result.current.run?.turnTimer).toBeUndefined();
    expect(result.current.timer.isPaused).toBe(false);
    act(() => {
      const pending = result.current.run!;
      result.current.setRun({ ...pending, battle: { ...pending.battle!, firstSide: "player" } });
    });
    expect(result.current.run?.turnTimer?.deadlineAt).toBe(BASE_TIME + 30_000);
  });

  it("starts the player's turn at thirty seconds without saving each display tick", () => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
    const { result } = setup();
    const firstDeadline = result.current.run?.turnTimer?.deadlineAt;
    expect(firstDeadline).toBe(BASE_TIME + 30_000);
    expect(result.current.timer.remainingSeconds).toBe(30);

    act(() => { vi.advanceTimersByTime(1_200); });
    expect(result.current.timer.remainingSeconds).toBe(29);
    expect(result.current.run?.turnTimer?.deadlineAt).toBe(firstDeadline);
  });

  it("freezes the precise remainder while paused and resumes from it", () => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
    const { result, rerender } = setup();
    act(() => { vi.advanceTimersByTime(4_250); });
    rerender({ paused: true });

    expect(result.current.timer.isPaused).toBe(true);
    expect(result.current.run?.turnTimer).toMatchObject({ deadlineAt: null, pausedRemainingMs: 25_750 });
    act(() => { vi.advanceTimersByTime(2_000); });
    expect(result.current.timer.remainingMs).toBe(25_750);

    rerender({ paused: false });
    expect(result.current.run?.turnTimer).toMatchObject({ deadlineAt: Date.now() + 25_750, pausedRemainingMs: null });
  });

  it("restores a matching snapshot and resets a snapshot from another turn", () => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
    const matching = createRun(62);
    matching.turnTimer = { battleId: matching.battle!.battleId, turnNumber: matching.battle!.turnNumber, deadlineAt: BASE_TIME + 6_400, pausedRemainingMs: null };
    const { result } = setup(matching);
    expect(result.current.timer.remainingMs).toBe(6_400);
    expect(result.current.run?.turnTimer).toEqual(matching.turnTimer);

    const otherTurn = { ...matching, turnTimer: { ...matching.turnTimer, turnNumber: matching.turnTimer.turnNumber + 1 } };
    act(() => { result.current.setRun(otherTurn); });
    expect(result.current.run?.turnTimer).toEqual({ battleId: matching.battle!.battleId, turnNumber: matching.battle!.turnNumber, deadlineAt: BASE_TIME + 30_000, pausedRemainingMs: null });
  });

  it("ends an expired player turn once and ignores enemy or completed battles", () => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
    const { onTimeout } = setup();
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(onTimeout).toHaveBeenCalledOnce();
    act(() => { vi.advanceTimersByTime(1_000); });
    expect(onTimeout).toHaveBeenCalledOnce();

    const enemyRun = createRun(63);
    enemyRun.battle!.activeSide = "enemy";
    const enemy = setup(enemyRun);
    expect(enemy.result.current.run?.turnTimer).toBeUndefined();
    expect(enemy.onTimeout).not.toHaveBeenCalled();

    const endedRun = createRun(64);
    endedRun.battle!.status = "playerWon";
    const ended = setup(endedRun);
    expect(ended.result.current.run?.turnTimer).toBeUndefined();
    expect(ended.onTimeout).not.toHaveBeenCalled();
  });

  it("pauses while the browser tab is hidden and resumes on visibility", () => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
    const { result } = setup();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    act(() => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(result.current.timer.isPaused).toBe(true);
    expect(result.current.run?.turnTimer).toMatchObject({ deadlineAt: null, pausedRemainingMs: 30_000 });

    act(() => { vi.advanceTimersByTime(2_000); });
    expect(result.current.timer.remainingMs).toBe(30_000);
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    act(() => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(result.current.run?.turnTimer).toMatchObject({ deadlineAt: Date.now() + 30_000, pausedRemainingMs: null });
  });
});
