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

/** One-time tips shown the first time a rule comes up in play. */
export type TutorialTipId = "taunt" | "fatigue";

const TIP_IDS: readonly TutorialTipId[] = ["taunt", "fatigue"];
const TIPS_KEY_PREFIX = "board-card-roguelike:tutorial-tips:v1:";

function tipsKey(userId: string): string {
  return `${TIPS_KEY_PREFIX}${encodeURIComponent(userId)}`;
}

/** Tips this account has already seen. Storage errors and bad data count as "none seen". */
export function loadSeenTips(storage: Storage, userId: string): Set<TutorialTipId> {
  try {
    const serialized = storage.getItem(tipsKey(userId));
    if (serialized === null) return new Set();
    const value: unknown = JSON.parse(serialized);
    if (!isRecord(value) || value.schemaVersion !== 1 || value.userId !== userId || !Array.isArray(value.seen)) return new Set();
    return new Set(TIP_IDS.filter((tip) => (value.seen as unknown[]).includes(tip)));
  } catch {
    return new Set();
  }
}

export function markTipSeen(storage: Storage, userId: string, tip: TutorialTipId): { status: "saved" } | { status: "error"; error: unknown } {
  try {
    const seen = loadSeenTips(storage, userId);
    seen.add(tip);
    storage.setItem(tipsKey(userId), JSON.stringify({ schemaVersion: 1, userId, seen: TIP_IDS.filter((id) => seen.has(id)) }));
    return { status: "saved" };
  } catch (error) {
    return { status: "error", error };
  }
}
