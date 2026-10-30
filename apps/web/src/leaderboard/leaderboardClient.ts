export type RunDifficulty = "normal" | "hard";

export interface LeaderboardRecord {
  id: "best-progress" | "best-progress:hard";
  userId: string;
  displayName: string;
  difficulty: RunDifficulty;
  completedBattles: number;
  recordedAt: string;
  schemaVersion: 2;
}

export class LeaderboardApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "LeaderboardApiError";
  }
}

export async function getTopTen(token: string, difficulty: RunDifficulty, fetcher: typeof fetch = fetch): Promise<LeaderboardRecord[]> {
  const body = await requestJson(`/api/leaderboard?difficulty=${difficulty}`, token, undefined, fetcher);
  if (!isObject(body) || !Array.isArray(body.items) || body.items.length > 10 || !body.items.every(isLeaderboardRecord)) {
    throw new LeaderboardApiError("랭킹 정보를 읽을 수 없습니다.");
  }
  return body.items;
}

export async function submitProgress(
  token: string,
  completedBattles: number,
  difficulty: RunDifficulty,
  fetcher: typeof fetch = fetch,
): Promise<{ record: LeaderboardRecord; updated: boolean }> {
  if (!Number.isInteger(completedBattles) || completedBattles < 1 || completedBattles > 12) {
    throw new LeaderboardApiError("유효하지 않은 원정 진행도입니다.");
  }
  const body = await requestJson("/api/leaderboard/progress", token, { completedBattles, difficulty }, fetcher);
  if (!isObject(body) || !isLeaderboardRecord(body.record) || typeof body.updated !== "boolean") {
    throw new LeaderboardApiError("랭킹 응답을 읽을 수 없습니다.");
  }
  return { record: body.record, updated: body.updated };
}

async function requestJson(
  path: string,
  token: string,
  payload: { completedBattles: number; difficulty: RunDifficulty } | undefined,
  fetcher: typeof fetch,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetcher(path, {
      method: payload ? "POST" : "GET",
      headers: {
        "X-Leaderboard-Access-Token": token,
        ...(payload ? { "Content-Type": "application/json" } : {}),
      },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    });
  } catch {
    throw new LeaderboardApiError("랭킹 서버에 연결할 수 없습니다. 잠시 후 다시 시도하세요.");
  }

  if (!response.ok) {
    const code = await readApiErrorCode(response);
    const diagnostic = code ? `HTTP ${response.status}, ${code}` : `HTTP ${response.status}`;
    throw new LeaderboardApiError(`랭킹 요청에 실패했습니다. (${diagnostic})`, response.status);
  }
  try {
    return await response.json() as unknown;
  } catch {
    throw new LeaderboardApiError("랭킹 서버 응답을 읽을 수 없습니다.", response.status);
  }
}

async function readApiErrorCode(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.clone().json();
    if (!isObject(body) || !isObject(body.error) || typeof body.error.code !== "string") return undefined;
    return /^[A-Z][A-Z0-9_]{0,63}$/.test(body.error.code) ? body.error.code : undefined;
  } catch {
    return undefined;
  }
}

function isLeaderboardRecord(value: unknown): value is LeaderboardRecord {
  if (!isObject(value)) return false;
  const validDifficulty = value.difficulty === "normal" || value.difficulty === "hard";
  return validDifficulty
    && value.id === (value.difficulty === "hard" ? "best-progress:hard" : "best-progress")
    && typeof value.userId === "string" && value.userId.length > 0
    && typeof value.displayName === "string" && value.displayName.length > 0
    && typeof value.completedBattles === "number" && Number.isInteger(value.completedBattles)
    && value.completedBattles >= 1 && value.completedBattles <= 12
    && typeof value.recordedAt === "string" && !Number.isNaN(Date.parse(value.recordedAt))
    && value.schemaVersion === 2;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
