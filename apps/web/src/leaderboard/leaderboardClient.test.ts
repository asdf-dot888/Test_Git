import { describe, expect, it, vi } from "vitest";
import { getTopTen, LeaderboardApiError, submitProgress } from "./leaderboardClient.js";

const normalEntry = {
  id: "best-progress" as const,
  userId: "employee-1",
  displayName: "Employee One",
  difficulty: "normal" as const,
  completedBattles: 5,
  recordedAt: "2026-10-26T00:00:00.000Z",
  schemaVersion: 2 as const,
};

const hardEntry = { ...normalEntry, id: "best-progress:hard" as const, difficulty: "hard" as const };

describe("leaderboardClient", () => {
  it("fetches the selected top ten with a token and validates difficulty-specific entries", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ items: [hardEntry] }), { status: 200 }));

    await expect(getTopTen("secret-access-token", "hard", fetcher)).resolves.toEqual([hardEntry]);

    expect(fetcher).toHaveBeenCalledWith("/api/leaderboard?difficulty=hard", {
      method: "GET",
      headers: { "X-Leaderboard-Access-Token": "secret-access-token" },
    });
  });

  it("sends completed progress and the selected difficulty", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ record: normalEntry, updated: true }), { status: 200 }));

    await expect(submitProgress("access-token", 5, "normal", fetcher)).resolves.toEqual({ record: normalEntry, updated: true });

    expect(fetcher).toHaveBeenCalledWith("/api/leaderboard/progress", {
      method: "POST",
      headers: { "X-Leaderboard-Access-Token": "access-token", "Content-Type": "application/json" },
      body: JSON.stringify({ completedBattles: 5, difficulty: "normal" }),
    });
  });

  it("rejects mismatched response IDs, invalid counts, and HTTP failures with safe errors", async () => {
    const invalidFetch = vi.fn(async () => new Response(JSON.stringify({ items: [{ ...normalEntry, id: "best-progress:hard" }] }), { status: 200 }));
    const failedFetch = vi.fn(async () => new Response("private server detail", { status: 503 }));

    await expect(getTopTen("token", "normal", invalidFetch)).rejects.toBeInstanceOf(LeaderboardApiError);
    await expect(submitProgress("token", 13, "normal", failedFetch)).rejects.toBeInstanceOf(LeaderboardApiError);
    await expect(submitProgress("token", 5, "normal", failedFetch)).rejects.toBeInstanceOf(LeaderboardApiError);
  });
});
