import type { RunState } from "@board-game/game-core";

const PLAYER_CLASSES = new Set(["warrior", "assassin", "demonist"]);

const STORAGE_KEY_PREFIX = "board-card-roguelike:run:v1:";

export type LocalRunLoadResult =
  | { status: "loaded"; run: RunState }
  | { status: "empty" }
  | { status: "error"; error: unknown };

export type LocalRunStorageResult = { status: "saved" | "cleared" } | { status: "error"; error: unknown };

type StoredRunEnvelope = {
  schemaVersion: 1;
  userId: string;
  savedAt: string;
  run: RunState;
};

export interface LocalRunStorage {
  load(userId: string): LocalRunLoadResult;
  save(userId: string, run: RunState): LocalRunStorageResult;
  clear(userId: string): LocalRunStorageResult;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRunState(value: unknown): value is RunState {
  if (!isRecord(value)) return false;

  return typeof value.runId === "string"
    && Number.isInteger(value.seed)
    && Number.isInteger(value.nextInstanceNumber)
    && (value.phase === 1 || value.phase === 2 || value.phase === 3)
    && (value.encounterInPhase === 0 || value.encounterInPhase === 1 || value.encounterInPhase === 2 || value.encounterInPhase === 3)
    && Number.isInteger(value.completedBattles)
    && (value.status === "active" || value.status === "victory" || value.status === "defeat")
    && (value.playerClass === undefined || (typeof value.playerClass === "string" && PLAYER_CLASSES.has(value.playerClass)))
    && Array.isArray(value.deck)
    && Array.isArray(value.starterDeck)
    && (value.battle === null || isRecord(value.battle))
    && (value.pendingReward === null || isRecord(value.pendingReward))
    && Array.isArray(value.encounters)
    && (value.turnTimer === undefined || isRecord(value.turnTimer));
}

function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${encodeURIComponent(userId)}`;
}

export function createLocalRunStorage(storage: Storage): LocalRunStorage {
  return {
    load(userId) {
      let serialized: string | null;
      try {
        serialized = storage.getItem(storageKey(userId));
      } catch (error) {
        return { status: "error", error };
      }
      if (serialized === null) return { status: "empty" };

      let value: unknown;
      try {
        value = JSON.parse(serialized);
      } catch {
        return { status: "empty" };
      }
      if (!isRecord(value)
        || value.schemaVersion !== 1
        || value.userId !== userId
        || typeof value.savedAt !== "string"
        || Number.isNaN(Date.parse(value.savedAt))
        || !isRunState(value.run)) {
        return { status: "empty" };
      }

      return { status: "loaded", run: value.run };
    },

    save(userId, run) {
      try {
        const envelope: StoredRunEnvelope = {
          schemaVersion: 1,
          userId,
          savedAt: new Date().toISOString(),
          run,
        };
        storage.setItem(storageKey(userId), JSON.stringify(envelope));
        return { status: "saved" };
      } catch (error) {
        return { status: "error", error };
      }
    },

    clear(userId) {
      try {
        storage.removeItem(storageKey(userId));
        return { status: "cleared" };
      } catch (error) {
        return { status: "error", error };
      }
    },
  };
}
