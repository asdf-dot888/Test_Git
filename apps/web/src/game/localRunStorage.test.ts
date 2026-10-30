import { createRun } from "@board-game/game-core";
import { describe, expect, it } from "vitest";
import { createLocalRunStorage } from "./localRunStorage";

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear() { values.clear(); },
    getItem(key) { return values.get(key) ?? null; },
    key(index) { return [...values.keys()][index] ?? null; },
    removeItem(key) { values.delete(key); },
    setItem(key, value) { values.set(key, String(value)); },
  };
}

describe("account-scoped local run storage", () => {
  it("round-trips the complete RunState envelope for the same account", () => {
    const storage = createMemoryStorage();
    const runs = createLocalRunStorage(storage);
    const run = createRun(417);

    expect(runs.save("employee-oid-1", run)).toEqual({ status: "saved" });
    expect(runs.load("employee-oid-1")).toEqual({ status: "loaded", run });

    const envelope = JSON.parse(storage.getItem("board-card-roguelike:run:v1:employee-oid-1") ?? "null");
    expect(envelope).toMatchObject({ schemaVersion: 1, userId: "employee-oid-1", run });
    expect(Number.isNaN(Date.parse(envelope.savedAt))).toBe(false);
  });

  it("keeps valid class metadata and accepts classless legacy saves without rebuilding them", () => {
    const storage = createMemoryStorage();
    const runs = createLocalRunStorage(storage);
    const classRun = createRun(418, "assassin");
    expect(runs.save("class-player", classRun)).toEqual({ status: "saved" });
    expect(runs.load("class-player")).toEqual({ status: "loaded", run: classRun });

    const legacyRun = createRun(419);
    delete legacyRun.playerClass;
    delete (legacyRun as Partial<typeof legacyRun>).difficulty;
    const expectedDeck = structuredClone(legacyRun.deck);
    expect(runs.save("legacy-player", legacyRun)).toEqual({ status: "saved" });
    const loaded = runs.load("legacy-player");
    expect(loaded).toEqual({ status: "loaded", run: { ...legacyRun, difficulty: "normal" } });
    if (loaded.status === "loaded") {
      expect(loaded.run.playerClass).toBeUndefined();
      expect(loaded.run.difficulty).toBe("normal");
      expect(loaded.run.deck).toEqual(expectedDeck);
    }
  });

  it("loads an older local save without redraw eligibility as unavailable", () => {
    const storage = createMemoryStorage();
    const run = createRun(420);
    delete run.openingHandRedrawAvailable;
    storage.setItem("board-card-roguelike:run:v1:legacy-redraw", JSON.stringify({ schemaVersion: 1, userId: "legacy-redraw", savedAt: new Date().toISOString(), run }));

    const loaded = createLocalRunStorage(storage).load("legacy-redraw");
    expect(loaded.status).toBe("loaded");
    if (loaded.status === "loaded") expect(loaded.run.openingHandRedrawAvailable).toBe(false);
  });

  it("isolates runs by account and can clear only the selected account", () => {
    const runs = createLocalRunStorage(createMemoryStorage());
    const firstRun = createRun(11);
    const secondRun = createRun(22);

    runs.save("employee-a", firstRun);
    runs.save("employee/b", secondRun);

    expect(runs.load("employee-a")).toEqual({ status: "loaded", run: firstRun });
    expect(runs.load("employee/b")).toEqual({ status: "loaded", run: secondRun });
    expect(runs.clear("employee-a")).toEqual({ status: "cleared" });
    expect(runs.load("employee-a")).toEqual({ status: "empty" });
    expect(runs.load("employee/b")).toEqual({ status: "loaded", run: secondRun });
  });

  it("returns empty when no run exists", () => {
    expect(createLocalRunStorage(createMemoryStorage()).load("employee-a")).toEqual({ status: "empty" });
  });

  it.each([
    "not-json",
    JSON.stringify({ schemaVersion: 2, userId: "employee-a", savedAt: new Date().toISOString(), run: createRun(1) }),
    JSON.stringify({ schemaVersion: 1, userId: "someone-else", savedAt: new Date().toISOString(), run: createRun(1) }),
    JSON.stringify({ schemaVersion: 1, userId: "employee-a", savedAt: "invalid", run: createRun(1) }),
    JSON.stringify({ schemaVersion: 1, userId: "employee-a", savedAt: new Date().toISOString(), run: { runId: "broken" } }),
    JSON.stringify({ schemaVersion: 1, userId: "employee-a", savedAt: new Date().toISOString(), run: { ...createRun(2), playerClass: "mage" } }),
  ])("treats malformed, unsupported, or cross-account data as unavailable", (serialized) => {
    const storage = createMemoryStorage();
    storage.setItem("board-card-roguelike:run:v1:employee-a", serialized);

    expect(createLocalRunStorage(storage).load("employee-a")).toEqual({ status: "empty" });
  });

  it("returns recoverable errors when storage reads, writes, or removes fail", () => {
    const failure = new Error("storage blocked");
    const throwingStorage = {
      getItem() { throw failure; },
      setItem() { throw failure; },
      removeItem() { throw failure; },
    } as unknown as Storage;
    const runs = createLocalRunStorage(throwingStorage);

    expect(runs.load("employee-a")).toEqual({ status: "error", error: failure });
    expect(runs.save("employee-a", createRun(1))).toEqual({ status: "error", error: failure });
    expect(runs.clear("employee-a")).toEqual({ status: "error", error: failure });
  });
});
