import { useCallback, useEffect, useRef, useState } from "react";
import { createRun as createGameRun, type PlayerClass, type RunState } from "@board-game/game-core";
import { useAuth } from "../auth/useAuth.js";
import { createLocalRunStorage, type LocalRunStorage } from "./localRunStorage.js";

export interface LocalRunController {
  status: "loading" | "ready" | "saving" | "locked" | "conflict" | "error";
  etag?: string | null;
  expiresAt?: string | null;
  message: string | null;
  warning?: string | null;
  run: RunState | null;
  loaded: boolean;
  loadVersion: number;
  saveRun(run: RunState): Promise<void>;
  createRun(seed: number, playerClass: PlayerClass): Promise<RunState>;
  replaceRun(reason: "completed" | "abandoned", seed: number, playerClass: PlayerClass): Promise<RunState>;
  deleteRun(reason: "completed" | "abandoned"): Promise<void>;
  reload(): Promise<void>;
  retrySave(run: RunState | null): Promise<void>;
  retry(): Promise<void>;
}

interface LocalRunState {
  userId: string | null;
  status: LocalRunController["status"];
  run: RunState | null;
  loaded: boolean;
  loadVersion: number;
  warning: string | null;
}

const SAVE_WARNING = "이 브라우저에서 진행 상황을 저장할 수 없습니다. 현재 세션은 계속할 수 있지만 새로고침하거나 브라우저를 닫으면 진행 상황을 잃을 수 있습니다.";

function getStorage(): LocalRunStorage {
  return createLocalRunStorage(window.localStorage);
}

export function useLocalRun(): LocalRunController {
  const { userId } = useAuth();
  const [state, setState] = useState<LocalRunState>({
    userId: null,
    status: "loading",
    run: null,
    loaded: false,
    loadVersion: 0,
    warning: null,
  });
  const load = useCallback(async () => {
    if (!userId) {
      setState((current) => ({ ...current, userId: null, status: "loading", run: null, loaded: false, warning: null }));
      return;
    }

    try {
      const result = getStorage().load(userId);
      setState((current) => ({
        userId,
        status: "ready",
        run: result.status === "loaded" ? result.run : null,
        loaded: true,
        loadVersion: current.loadVersion + 1,
        warning: result.status === "error" ? SAVE_WARNING : null,
      }));
    } catch {
      setState((current) => ({ ...current, userId, status: "ready", run: null, loaded: true, loadVersion: current.loadVersion + 1, warning: SAVE_WARNING }));
    }
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  const saveRun = useCallback(async (run: RunState) => {
    if (!userId) return;
    let warning: string | null = null;
    try {
      const result = getStorage().save(userId, run);
      if (result.status === "error") warning = SAVE_WARNING;
    } catch {
      warning = SAVE_WARNING;
    }
    setState((current) => ({ ...current, userId, status: "ready", run, loaded: true, warning }));
  }, [userId]);

  const createRun = useCallback(async (seed: number, playerClass: PlayerClass) => {
    const run = createGameRun(seed, playerClass);
    await saveRun(run);
    return run;
  }, [saveRun]);

  const replaceRun = useCallback(async (_reason: "completed" | "abandoned", seed: number, playerClass: PlayerClass) => createRun(seed, playerClass), [createRun]);

  const deleteRun = useCallback(async (_reason: "completed" | "abandoned") => {
    if (!userId) return;
    let warning: string | null = null;
    try {
      const result = getStorage().clear(userId);
      if (result.status === "error") warning = SAVE_WARNING;
    } catch {
      warning = SAVE_WARNING;
    }
    setState((current) => ({ ...current, userId, status: "ready", run: null, loaded: true, warning }));
  }, [userId]);

  const retrySave = useCallback(async (run: RunState | null) => {
    if (run) await saveRun(run);
    else await load();
  }, [load, saveRun]);

  return {
    status: state.userId === userId && state.loaded ? "ready" : "loading",
    etag: null,
    expiresAt: null,
    message: null,
    warning: state.warning,
    run: state.userId === userId ? state.run : null,
    loaded: state.userId === userId && state.loaded,
    loadVersion: state.loadVersion,
    saveRun,
    createRun,
    replaceRun,
    deleteRun,
    reload: load,
    retrySave,
    retry: load,
  };
}

