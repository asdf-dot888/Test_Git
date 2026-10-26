import type { HttpRequest } from "@azure/functions";
import { describe, expect, it, vi } from "vitest";
import { EntraTokenError } from "../auth/entraBearer.js";
import type { LeaderboardRecord, LeaderboardRepository } from "../leaderboard/types.js";
import { createLeaderboardHandlers } from "./leaderboard.js";

const principal = { userId: "verified-oid", displayName: "Verified Name", tenantId: "tenant-123" };
const record: LeaderboardRecord = {
  id: "best-progress",
  userId: principal.userId,
  displayName: principal.displayName,
  completedBattles: 4,
  recordedAt: "2026-10-26T00:00:00.000Z",
  schemaVersion: 1,
};

function request(options: { method?: string; authorization?: string; body?: string } = {}) {
  return new Request("https://game.example/api/leaderboard", {
    method: options.method ?? "GET",
    headers: {
      ...(options.authorization ? { authorization: options.authorization } : {}),
      ...(options.body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(options.body === undefined ? {} : { body: options.body }),
  }) as unknown as HttpRequest;
}

function repository(overrides: Partial<LeaderboardRepository> = {}): LeaderboardRepository {
  return {
    getTopTen: vi.fn(async () => [record]),
    recordBestProgress: vi.fn(async () => ({ record, updated: true })),
    ...overrides,
  };
}

function handlers(repo = repository(), overrides: { verifyToken?: (token: string) => Promise<typeof principal>; isConfigured?: () => boolean } = {}) {
  const dependencies = {
    verifyToken: overrides.verifyToken ?? vi.fn(async () => principal),
    repository: repo,
    now: () => new Date("2026-10-26T00:00:00.000Z"),
    ...(overrides.isConfigured ? { isConfigured: overrides.isConfigured } : {}),
  };
  return {
    repo,
    ...createLeaderboardHandlers(dependencies),
  };
}

describe("Static Web Apps leaderboard function handlers", () => {
  it("returns at most ten items from the repository", async () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({ ...record, userId: `user-${index}` }));
    const repo = repository({ getTopTen: vi.fn(async () => rows) });
    const { get } = handlers(repo);
    const response = await get(request({ authorization: "Bearer valid-token" }));
    expect(response.status).toBe(200);
    expect(response.jsonBody).toEqual({ items: rows.slice(0, 10) });
  });

  it("requires a bearer token before calling the repository", async () => {
    const { get, repo } = handlers();
    const response = await get(request());
    expect(response.status).toBe(401);
    expect(response.jsonBody).toMatchObject({ error: { code: "UNAUTHENTICATED" } });
    expect(repo.getTopTen).not.toHaveBeenCalled();
  });

  it("returns 503 while auth settings are missing", async () => {
    const { get } = handlers(repository(), { isConfigured: () => false });
    const response = await get(request({ authorization: "Bearer valid-token" }));
    expect(response.status).toBe(503);
    expect(response.jsonBody).toMatchObject({ error: { code: "API_NOT_CONFIGURED" } });
  });

  it("returns the verifier's safe 403 response", async () => {
    const { get } = handlers(repository(), {
      verifyToken: vi.fn(async () => { throw new EntraTokenError(403, "INSUFFICIENT_SCOPE", "This company account cannot access the API."); }),
    });
    const response = await get(request({ authorization: "Bearer valid-token" }));
    expect(response.status).toBe(403);
    expect(response.jsonBody).toMatchObject({ error: { code: "INSUFFICIENT_SCOPE" } });
  });

  it("derives identity from the token and server time, ignoring forged body fields by rejecting them", async () => {
    const repo = repository();
    const { post } = handlers(repo);
    const response = await post(request({
      method: "POST",
      authorization: "Bearer valid-token",
      body: JSON.stringify({ completedBattles: 4, userId: "forged", displayName: "Forged" }),
    }));
    expect(response.status).toBe(400);
    expect(response.jsonBody).toMatchObject({ error: { code: "INVALID_PROGRESS" } });
    expect(repo.recordBestProgress).not.toHaveBeenCalled();
  });

  it("submits only validated progress with verified identity and injected server timestamp", async () => {
    const repo = repository();
    const { post } = handlers(repo);
    const response = await post(request({
      method: "POST",
      authorization: "Bearer valid-token",
      body: JSON.stringify({ completedBattles: 8 }),
    }));
    expect(response.status).toBe(200);
    expect(repo.recordBestProgress).toHaveBeenCalledWith({
      userId: "verified-oid",
      displayName: "Verified Name",
      completedBattles: 8,
      recordedAt: "2026-10-26T00:00:00.000Z",
    });
    expect(response.jsonBody).toEqual({ record, updated: true });
  });

  it("returns a generic unavailable error if repository work fails", async () => {
    const repo = repository({ getTopTen: vi.fn(async () => { throw new Error("private backend detail"); }) });
    const { get } = handlers(repo);
    const response = await get(request({ authorization: "Bearer valid-token" }));
    expect(response.status).toBe(503);
    expect(JSON.stringify(response.jsonBody)).not.toContain("private backend detail");
  });

  it("rejects invalid JSON and invalid progress values", async () => {
    const { post } = handlers();
    const invalidJson = await post(request({ method: "POST", authorization: "Bearer valid-token", body: "{" }));
    const invalidCount = await post(request({ method: "POST", authorization: "Bearer valid-token", body: JSON.stringify({ completedBattles: 13 }) }));
    expect(invalidJson.status).toBe(400);
    expect(invalidCount.status).toBe(400);
  });
});
