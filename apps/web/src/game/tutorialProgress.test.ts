import { describe, expect, it } from "vitest";
import { loadTutorialProgress, markTutorialCompleted } from "./tutorialProgress";

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

describe("per-user tutorial completion storage", () => {
  it("returns not-completed when no record exists", () => {
    expect(loadTutorialProgress(createMemoryStorage(), "employee-a")).toEqual({ status: "not-completed" });
  });

  it("saves only the versioned completion fields with an ISO timestamp", () => {
    const storage = createMemoryStorage();
    const completedAt = new Date("2026-10-30T03:00:00.000Z");

    expect(markTutorialCompleted(storage, "employee-a", completedAt)).toEqual({ status: "saved" });
    expect(storage.getItem("board-card-roguelike:tutorial:v1:employee-a")).toBe(JSON.stringify({
      schemaVersion: 1,
      userId: "employee-a",
      completed: true,
      completedAt: "2026-10-30T03:00:00.000Z",
    }));
    expect(loadTutorialProgress(storage, "employee-a")).toEqual({
      status: "completed",
      progress: {
        schemaVersion: 1,
        userId: "employee-a",
        completed: true,
        completedAt: "2026-10-30T03:00:00.000Z",
      },
    });
  });

  it("isolates completion records between users", () => {
    const storage = createMemoryStorage();
    markTutorialCompleted(storage, "employee/a", new Date("2026-10-30T03:00:00.000Z"));

    expect(storage.getItem("board-card-roguelike:tutorial:v1:employee%2Fa")).not.toBeNull();
    expect(loadTutorialProgress(storage, "employee/a").status).toBe("completed");
    expect(loadTutorialProgress(storage, "employee-b")).toEqual({ status: "not-completed" });
  });

  it.each([
    "not-json",
    JSON.stringify({ schemaVersion: 2, userId: "employee-a", completed: true, completedAt: "2026-10-30T03:00:00.000Z" }),
    JSON.stringify({ schemaVersion: 1, userId: "someone-else", completed: true, completedAt: "2026-10-30T03:00:00.000Z" }),
    JSON.stringify({ schemaVersion: 1, userId: "employee-a", completed: false, completedAt: "2026-10-30T03:00:00.000Z" }),
    JSON.stringify({ schemaVersion: 1, userId: "employee-a", completed: true, completedAt: "not-a-date" }),
  ])("treats malformed or unsupported completion data as incomplete", (serialized) => {
    const storage = createMemoryStorage();
    storage.setItem("board-card-roguelike:tutorial:v1:employee-a", serialized);

    expect(loadTutorialProgress(storage, "employee-a")).toEqual({ status: "not-completed" });
  });

  it("returns recoverable errors when storage reads or writes fail", () => {
    const failure = new Error("storage blocked");
    const throwingStorage = {
      getItem() { throw failure; },
      setItem() { throw failure; },
    } as unknown as Storage;

    expect(loadTutorialProgress(throwingStorage, "employee-a")).toEqual({ status: "error", error: failure });
    expect(markTutorialCompleted(throwingStorage, "employee-a")).toEqual({ status: "error", error: failure });
  });
});
