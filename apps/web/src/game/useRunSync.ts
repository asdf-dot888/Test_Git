import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RunState } from "@board-game/game-core";
import { RunClient, RunClientError, getTabOwnerId } from "../api/runClient.js";
import { useAuth } from "../auth/useAuth.js";

export interface RunSyncState {
  status: "loading" | "ready" | "saving" | "locked" | "conflict" | "error";
  etag: string | null;
  expiresAt: string | null;
  message: string | null;
  run: RunState | null;
  loaded: boolean;
  loadVersion: number;
}

const initialState: RunSyncState = {
  status: "loading",
  etag: null,
  expiresAt: null,
  message: null,
  run: null,
  loaded: false,
  loadVersion: 0,
};

function newOwnerId(): string {
  return globalThis.crypto.randomUUID();
}

export function useRunSync() {
  const auth = useAuth();
  const signIn = auth.signIn;
  const client = useMemo(
    () => new RunClient(import.meta.env.VITE_API_BASE_URL?.trim() ?? "", auth.getApiToken),
    [auth.getApiToken],
  );
  const [state, setState] = useState<RunSyncState>(initialState);
  const ownerIdRef = useRef<string | null>(null);
  const etagRef = useRef<string | null>(null);
  const lastQueuedRunRef = useRef<RunState | null>(null);
  const pendingSeedRef = useRef<number | null>(null);
  const loadVersionRef = useRef(0);
  const operationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const initialLoadRef = useRef<Promise<{ ownerId: string; run: Awaited<ReturnType<RunClient["getActiveRun"]>> } > | null>(null);

  const ownerId = useCallback(() => {
    if (ownerIdRef.current) return ownerIdRef.current;
    if (typeof window === "undefined") throw new Error("Run sync needs a browser tab.");
    ownerIdRef.current = getTabOwnerId(window.sessionStorage, newOwnerId);
    return ownerIdRef.current;
  }, []);

  const showError = useCallback((error: unknown) => {
    if (error instanceof RunClientError && error.status === 423) {
      setState((current) => ({ ...current, status: "locked", expiresAt: error.expiresAt, message: error.message, loaded: true }));
      return;
    }
    if (error instanceof RunClientError && error.status === 409) {
      setState((current) => ({ ...current, status: "conflict", message: error.message, loaded: true }));
      return;
    }
    if (error instanceof RunClientError && error.status === 401) {
      setState((current) => ({ ...current, status: "error", message: "?뚯궗 怨꾩젙 ?몄쬆??留뚮즺?섏뿀?듬땲?? ?ㅼ떆 濡쒓렇?명빐 二쇱꽭??", loaded: true }));
      void signIn().catch(() => undefined);
      return;
    }
    setState((current) => ({
      ...current,
      status: "error",
      message: error instanceof RunClientError ? error.message : "????곹깭瑜??뺤씤?섏? 紐삵뻽?듬땲?? ?곌껐???뺤씤?섍퀬 ?ㅼ떆 ?쒕룄??二쇱꽭??",
      loaded: true,
    }));
  }, [signIn]);

  const acceptServerRun = useCallback((response: Awaited<ReturnType<RunClient["getActiveRun"]>>) => {
    loadVersionRef.current += 1;
    if (response.run && !response.etag) throw new RunClientError(502, "INVALID_RESPONSE", "?쒕쾭 ????묐떟???щ컮瑜댁? ?딆뒿?덈떎.");
    etagRef.current = response.etag ?? null;
    lastQueuedRunRef.current = response.run;
    setState({
      status: "ready",
      etag: response.etag ?? null,
      expiresAt: response.lease?.expiresAt ?? null,
      message: null,
      run: response.run,
      loaded: true,
      loadVersion: loadVersionRef.current,
    });
  }, []);

  const loadActiveRun = useCallback(async () => {
    try {
      const response = await client.getActiveRun(ownerId());
      acceptServerRun(response);
    } catch (error) {
      showError(error);
      throw error;
    }
  }, [acceptServerRun, client, ownerId, showError]);

  useEffect(() => {
    let active = true;
    if (!initialLoadRef.current) {
      const tabOwnerId = ownerId();
      initialLoadRef.current = client.getActiveRun(tabOwnerId).then((run) => ({ ownerId: tabOwnerId, run }));
    }
    void initialLoadRef.current.then(({ run }) => {
      if (active) acceptServerRun(run);
    }).catch((error: unknown) => {
      if (active) showError(error);
    });
    return () => { active = false; };
  }, [acceptServerRun, client, ownerId, showError]);

  const enqueue = useCallback(<T,>(operation: () => Promise<T>): Promise<T> => {
    const next = operationQueueRef.current.then(operation, operation);
    operationQueueRef.current = next.then(() => undefined, () => undefined);
    return next;
  }, []);

  const saveRun = useCallback((run: RunState): Promise<void> => {
    if (lastQueuedRunRef.current === run) return Promise.resolve();
    lastQueuedRunRef.current = run;
    return enqueue(async () => {
      setState((current) => ({ ...current, status: "saving", message: null }));
      try {
        const tabOwnerId = ownerId();
        if (etagRef.current === null) {
          pendingSeedRef.current = run.seed;
          const created = await client.createRun(run.seed, tabOwnerId);
          etagRef.current = created.etag;
          pendingSeedRef.current = null;
          setState((current) => ({ ...current, status: "ready", etag: created.etag, expiresAt: null, message: null, run, loaded: true }));
          return;
        }
        const saved = await client.saveRun(run, etagRef.current, tabOwnerId);
        etagRef.current = saved.etag;
        const activity = await client.recordActivity(tabOwnerId);
        etagRef.current = activity.etag;
        setState((current) => ({ ...current, status: "ready", etag: activity.etag, expiresAt: activity.expiresAt, message: null, run, loaded: true }));
      } catch (error) {
        lastQueuedRunRef.current = null;
        showError(error);
        throw error;
      }
    });
  }, [client, enqueue, ownerId, showError]);

  const createRun = useCallback((seed: number): Promise<RunState> => enqueue(async () => {
    try {
      pendingSeedRef.current = seed;
      setState((current) => ({ ...current, status: "saving", message: null }));
      const created = await client.createRun(seed, ownerId());
      etagRef.current = created.etag;
      pendingSeedRef.current = null;
      lastQueuedRunRef.current = created.run;
      setState((current) => ({ ...current, status: "ready", etag: created.etag, expiresAt: null, message: null, run: created.run, loaded: true }));
      return created.run;
    } catch (error) {
      showError(error);
      throw error;
    }
  }), [client, enqueue, ownerId, showError]);

  const replaceRun = useCallback((reason: "completed" | "abandoned", seed: number): Promise<RunState> => enqueue(async () => {
    try {
      pendingSeedRef.current = seed;
      setState((current) => ({ ...current, status: "saving", message: null }));
      const tabOwnerId = ownerId();
      if (etagRef.current !== null) {
        await client.deleteRun(reason, tabOwnerId);
        etagRef.current = null;
        lastQueuedRunRef.current = null;
      }
      const created = await client.createRun(seed, tabOwnerId);
      etagRef.current = created.etag;
      pendingSeedRef.current = null;
      lastQueuedRunRef.current = created.run;
      setState((current) => ({ ...current, status: "ready", etag: created.etag, expiresAt: null, message: null, run: created.run, loaded: true }));
      return created.run;
    } catch (error) {
      showError(error);
      throw error;
    }
  }), [client, enqueue, ownerId, showError]);

  const deleteRun = useCallback((reason: "completed" | "abandoned"): Promise<void> => enqueue(async () => {
    try {
      if (etagRef.current !== null) await client.deleteRun(reason, ownerId());
      etagRef.current = null;
      lastQueuedRunRef.current = null;
      setState((current) => ({ ...current, status: "ready", etag: null, expiresAt: null, message: null, run: null, loaded: true }));
    } catch (error) {
      showError(error);
      throw error;
    }
  }), [client, enqueue, ownerId, showError]);

  const retrySave = useCallback((run: RunState | null): Promise<void> => {
    if (!run) {
      if (pendingSeedRef.current !== null) return createRun(pendingSeedRef.current).then(() => undefined);
      return Promise.resolve();
    }
    lastQueuedRunRef.current = null;
    return saveRun(run);
  }, [createRun, saveRun]);

  const retry = useCallback((): Promise<void> => {
    if (pendingSeedRef.current !== null) return retrySave(null);
    return loadActiveRun();
  }, [loadActiveRun, retrySave]);

  return { ...state, saveRun, createRun, replaceRun, deleteRun, reload: loadActiveRun, retrySave, retry };
}

