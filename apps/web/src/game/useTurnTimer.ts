import { useEffect, useRef, useState } from "react";
import type { RunState, TurnTimerState } from "@board-game/game-core";

const TURN_DURATION_MS = 20_000;
const CLOCK_REFRESH_MS = 200;

export interface TurnTimerViewState {
  remainingMs: number;
  remainingSeconds: number;
  isPaused: boolean;
}

export function useTurnTimer(options: {
  run: RunState | null;
  paused: boolean;
  onTimerChange(timer: TurnTimerState | undefined): void;
  onTimeout(): void;
  now?: () => number;
}): TurnTimerViewState {
  const { run, paused, onTimerChange, onTimeout, now = Date.now } = options;
  const [clockNow, setClockNow] = useState(now);
  const [documentVisible, setDocumentVisible] = useState(() => typeof document === "undefined" || document.visibilityState === "visible");
  const timeoutTurnId = useRef<string | null>(null);
  const activeBattle = run?.battle;
  const isPlayerTurn = activeBattle?.status === "active" && activeBattle.activeSide === "player";
  const turnId = isPlayerTurn && activeBattle ? `${activeBattle.battleId}:${activeBattle.turnNumber}` : null;
  const currentTimer = run?.turnTimer;
  const timerMatchesTurn = Boolean(turnId && activeBattle && currentTimer?.battleId === activeBattle.battleId && currentTimer.turnNumber === activeBattle.turnNumber);
  const shouldPause = paused || !documentVisible;

  useEffect(() => {
    const updateVisibility = () => setDocumentVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    if (!turnId || !activeBattle || !isPlayerTurn) {
      if (currentTimer) onTimerChange(undefined);
      return;
    }

    if (!timerMatchesTurn || !currentTimer) {
      timeoutTurnId.current = null;
      onTimerChange({
        battleId: activeBattle.battleId,
        turnNumber: activeBattle.turnNumber,
        deadlineAt: shouldPause ? null : now() + TURN_DURATION_MS,
        pausedRemainingMs: shouldPause ? TURN_DURATION_MS : null,
      });
      return;
    }

    if (shouldPause && currentTimer.deadlineAt !== null) {
      onTimerChange({
        ...currentTimer,
        deadlineAt: null,
        pausedRemainingMs: Math.max(0, Math.min(TURN_DURATION_MS, currentTimer.deadlineAt - now())),
      });
    } else if (!shouldPause && currentTimer.deadlineAt === null) {
      onTimerChange({
        ...currentTimer,
        deadlineAt: now() + Math.max(0, Math.min(TURN_DURATION_MS, currentTimer.pausedRemainingMs ?? TURN_DURATION_MS)),
        pausedRemainingMs: null,
      });
    }
  }, [activeBattle, currentTimer, isPlayerTurn, now, onTimerChange, shouldPause, timerMatchesTurn, turnId]);

  useEffect(() => {
    if (!turnId || !timerMatchesTurn || !currentTimer || currentTimer.deadlineAt === null || shouldPause) return;
    if (currentTimer.deadlineAt > clockNow || timeoutTurnId.current === turnId) return;
    timeoutTurnId.current = turnId;
    onTimeout();
  }, [clockNow, currentTimer, onTimeout, shouldPause, timerMatchesTurn, turnId]);

  useEffect(() => {
    if (!turnId) return;
    const interval = globalThis.setInterval(() => setClockNow(now()), CLOCK_REFRESH_MS);
    return () => globalThis.clearInterval(interval);
  }, [now, turnId]);

  const remainingMs = !turnId
    ? 0
    : !timerMatchesTurn || !currentTimer
      ? TURN_DURATION_MS
      : currentTimer.deadlineAt === null
        ? Math.max(0, Math.min(TURN_DURATION_MS, currentTimer.pausedRemainingMs ?? TURN_DURATION_MS))
        : Math.max(0, currentTimer.deadlineAt - clockNow);

  return {
    remainingMs,
    remainingSeconds: Math.max(0, Math.min(20, Math.ceil(remainingMs / 1000))),
    isPaused: Boolean(turnId && shouldPause),
  };
}
