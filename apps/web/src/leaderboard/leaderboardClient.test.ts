import { describe, expect, it, vi } from "vitest";
import { getTopTen, LeaderboardApiError, submitProgress } from "./leaderboardClient.js";

const entry = {
  id: "best-progress" as const,
  userId: "employee-1",
  displayName: "Employee One",
  completedBattles: 5,
  recordedAt: "2026-10-26T00:00:00.000Z",
  schemaVersion: 1 as const,
};

describe("leaderboardClient", () => {
  it("fetches the top ten with a bearer token and validates returned entries", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ items: [entry] }), { status: 200 }));

    await expect(getTopTen("secret-access-token", fetcher)).resolves.toEqual([entry]);

    expect(fetcher).toHaveBeenCalledWith("/api/leaderboard", {
      method: "GET",
      headers: { Authorization: "Bearer secret-access-token" },
    });
  });

  it("sends only the completed battle count when submitting progress", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ record: entry, updated: true }), { status: 200 }));

    await expect(submitProgress("access-token", 5, fetcher)).resolves.toEqual({ record: entry, updated: true });

    expect(fetcher).toHaveBeenCalledWith("/api/leaderboard/progress", {
      method: "POST",
      headers: { Authorization: "Bearer access-token", "Content-Type": "application/json" },
      body: JSON.stringify({ completedBattles: 5 }),
    });
  });

  it("rejects malformed response contracts, invalid counts, and HTTP failures with safe errors", async () => {
    const invalidFetch = vi.fn(async () => new Response(JSON.stringify({ items: [{ ...entry, userId: "" }] }), { status: 200 }));
    const failedFetch = vi.fn(async () => new Response("private server detail", { status: 503 }));

    await expect(getTopTen("token", invalidFetch)).rejects.toBeInstanceOf(LeaderboardApiError);
    await expect(submitProgress("token", 13, failedFetch)).rejects.toThrow("유효하지 않은 원정 진행도입니다.");
    await expect(submitProgress("token", 5, failedFetch)).rejects.toThrow("랭킹 요청에 실패했습니다.");
  });
});
