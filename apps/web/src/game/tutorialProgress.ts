export interface TutorialProgress {
  schemaVersion: 1;
  userId: string;
  completed: true;
  completedAt: string;
}

export type TutorialProgressResult =
  | { status: "completed"; progress: TutorialProgress }
  | { status: "not-completed" }
  | { status: "error"; error: unknown };

const STORAGE_KEY_PREFIX = "board-card-roguelike:tutorial:v1:";

function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${encodeURIComponent(userId)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTutorialProgress(value: unknown, userId: string): value is TutorialProgress {
  if (!isRecord(value)) return false;

  return value.schemaVersion === 1
    && value.userId === userId
    && value.completed === true
    && typeof value.completedAt === "string"
    && !Number.isNaN(Date.parse(value.completedAt));
}

export function loadTutorialProgress(storage: Storage, userId: string): TutorialProgressResult {
  let serialized: string | null;
  try {
    serialized = storage.getItem(storageKey(userId));
  } catch (error) {
    return { status: "error", error };
  }

  if (serialized === null) return { status: "not-completed" };

  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    return { status: "not-completed" };
  }

  if (!isTutorialProgress(value, userId)) return { status: "not-completed" };
  return { status: "completed", progress: value };
}

export function markTutorialCompleted(
  storage: Storage,
  userId: string,
  completedAt: Date = new Date(),
): { status: "saved" } | { status: "error"; error: unknown } {
  try {
    const progress: TutorialProgress = {
      schemaVersion: 1,
      userId,
      completed: true,
      completedAt: completedAt.toISOString(),
    };
    storage.setItem(storageKey(userId), JSON.stringify(progress));
    return { status: "saved" };
  } catch (error) {
    return { status: "error", error };
  }
}
