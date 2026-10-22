import { useCallback } from "react";
import { createRun as createGameRun, type RunState } from "@board-game/game-core";
import type { RunSyncController } from "./useRunSync.js";

export function useDemoRunSync(): RunSyncController {
  const saveRun = useCallback(async (run: RunState) => { void run; }, []);
  const createRun = useCallback(async (seed: number) => createGameRun(seed), []);
  const replaceRun = useCallback(async (reason: "completed" | "abandoned", seed: number) => {
    void reason;
    return createGameRun(seed);
  }, []);
  const deleteRun = useCallback(async (reason: "completed" | "abandoned") => { void reason; }, []);
  const reload = useCallback(async () => undefined, []);
  const retrySave = useCallback(async (run: RunState | null) => { void run; }, []);
  const retry = useCallback(async () => undefined, []);

  return {
    status: "ready",
    etag: null,
    expiresAt: null,
    message: null,
    run: null,
    loaded: true,
    loadVersion: 0,
    saveRun,
    createRun,
    replaceRun,
    deleteRun,
    reload,
    retrySave,
    retry,
  };
}
