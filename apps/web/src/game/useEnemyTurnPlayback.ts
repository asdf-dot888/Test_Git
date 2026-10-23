import { useEffect, useRef } from "react";

const ACTION_GAP_MS = 1_000;

export function useEnemyTurnPlayback(options: {
  active: boolean;
  stepKey: number | null;
  paused: boolean;
  hasEffects: boolean;
  onAdvance(): void;
}): void {
  const { active, stepKey, paused, hasEffects, onAdvance } = options;
  const remainingMs = useRef(ACTION_GAP_MS);
  const deadline = useRef<number | null>(null);
  const activeTimer = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const previousStepKey = useRef<number | null>(null);
  const onAdvanceRef = useRef(onAdvance);

  useEffect(() => {
    onAdvanceRef.current = onAdvance;
  }, [onAdvance]);

  useEffect(() => {
    if (!active) {
      if (activeTimer.current !== null) globalThis.clearTimeout(activeTimer.current);
      activeTimer.current = null;
      deadline.current = null;
      remainingMs.current = ACTION_GAP_MS;
      previousStepKey.current = null;
      return;
    }

    if (previousStepKey.current !== stepKey) {
      previousStepKey.current = stepKey;
      remainingMs.current = ACTION_GAP_MS;
      deadline.current = null;
    }

    if (paused || hasEffects) {
      if (activeTimer.current !== null) {
        globalThis.clearTimeout(activeTimer.current);
        activeTimer.current = null;
      }
      if (deadline.current !== null) {
        remainingMs.current = Math.max(0, deadline.current - Date.now());
        deadline.current = null;
      }
      return;
    }

    deadline.current = Date.now() + remainingMs.current;
    activeTimer.current = globalThis.setTimeout(() => {
      activeTimer.current = null;
      deadline.current = null;
      remainingMs.current = ACTION_GAP_MS;
      onAdvanceRef.current();
    }, remainingMs.current);

    return () => {
      if (activeTimer.current !== null) {
        globalThis.clearTimeout(activeTimer.current);
        activeTimer.current = null;
      }
      if (deadline.current !== null) {
        remainingMs.current = Math.max(0, deadline.current - Date.now());
        deadline.current = null;
      }
    };
  }, [active, hasEffects, paused, stepKey]);
}
