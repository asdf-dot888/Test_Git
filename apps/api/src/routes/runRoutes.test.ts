import { createServer, type Server } from "node:http";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { createRun, type RunState } from "@board-game/game-core";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import type { AuthenticatedRequest } from "../auth/entraAuth.js";
import type { RunRecord } from "../db/runDocument.js";
import { ActiveRunExistsError, RunConflictError, RunLockedError, RunNotFoundError, RunStorageUnavailableError } from "../db/runErrors.js";
import type { RunRepository } from "../db/runRepository.js";

const config = {
  entraTenantId: "tenant-123",
  entraApiAudience: "api://game-api",
  cosmosEndpoint: "",
  cosmosDatabase: "card-roguelike",
  cosmosContainer: "active-runs",
  port: 3001,
};
const userId = "entra-verified-oid";
const ownerId = "1d0a0a31-5713-4d1f-96f4-684a1bb5d53a";
const instant = new Date("2026-10-21T10:00:00.000Z");

class FakeRunRepository implements RunRepository {
  record: RunRecord | null = null;
  readonly get = vi.fn(async () => this.record);
  readonly create = vi.fn(async (verifiedUserId: string, run: RunState, owner: string, now: Date) => {
    if (this.record) throw new ActiveRunExistsError();
    this.record = {
      etag: "etag-1",
      document: { id: "active-run", userId: verifiedUserId, schemaVersion: 1, run, lease: { ownerId: owner, lastActivityAt: now.toISOString(), expiresAt: new Date(now.getTime() + 900_000).toISOString() }, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    };
    return this.record;
  });
  readonly save = vi.fn(async (verifiedUserId: string, owner: string, expectedEtag: string, run: RunState, now: Date) => {
    if (!this.record) throw new RunNotFoundError();
    if (this.record.document.lease?.ownerId !== owner) throw new RunLockedError(this.record.document.lease?.expiresAt ?? "");
    if (expectedEtag !== this.record.etag) throw new RunConflictError();
    this.record = { etag: "etag-2", document: { ...this.record.document, userId: verifiedUserId, run, updatedAt: now.toISOString() } };
    return this.record;
  });
  readonly acquire = vi.fn(async (verifiedUserId: string, owner: string, now: Date) => {
    if (!this.record) throw new RunNotFoundError();
    const lease = this.record.document.lease;
    if (lease && lease.ownerId !== owner && now.getTime() < Date.parse(lease.expiresAt)) throw new RunLockedError(lease.expiresAt);
    this.record = { etag: "etag-acquired", document: { ...this.record.document, userId: verifiedUserId, lease: { ownerId: owner, lastActivityAt: now.toISOString(), expiresAt: new Date(now.getTime() + 900_000).toISOString() } } };
    return this.record;
  });
  readonly recordActivity = vi.fn(async (verifiedUserId: string, owner: string, now: Date) => {
    if (!this.record) throw new RunNotFoundError();
    if (this.record.document.lease?.ownerId !== owner) throw new RunLockedError(this.record.document.lease?.expiresAt ?? "");
    this.record = { etag: "etag-activity", document: { ...this.record.document, userId: verifiedUserId, lease: { ownerId: owner, lastActivityAt: now.toISOString(), expiresAt: new Date(now.getTime() + 900_000).toISOString() } } };
    return this.record;
  });
  readonly delete = vi.fn(async (verifiedUserId: string, owner: string) => {
    if (!this.record) throw new RunNotFoundError();
    if (this.record.document.userId !== verifiedUserId || this.record.document.lease?.ownerId !== owner) throw new RunLockedError(this.record.document.lease?.expiresAt ?? "");
    this.record = null;
  });
}

describe("authenticated Run API", () => {
  const repository = new FakeRunRepository();
  let server: Server;
  let baseUrl: string;

  beforeEach(() => {
    repository.record = null;
    vi.clearAllMocks();
  });

  beforeAll(async () => {
    const authenticate: RequestHandler = (request: Request, _response: Response, next: NextFunction) => {
      (request as AuthenticatedRequest).authUser = { userId, tenantId: config.entraTenantId };
      next();
    };
    server = createServer(createApp({ config, authenticate, repository, runDependencies: { now: () => instant, newOwnerId: () => ownerId } }));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind to a TCP port.");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  it("creates a seeded run under verified oid and rejects replacement", async () => {
    const response = await fetch(`${baseUrl}/api/run`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-run-owner": ownerId },
      body: JSON.stringify({ seed: 921, userId: "attacker-selected-id" }),
    });
    const body = await response.json() as { run: RunState; etag: string };

    expect(response.status).toBe(201);
    expect(body.run.seed).toBe(921);
    expect(body.etag).toBe("etag-1");
    expect(repository.create).toHaveBeenCalledWith(userId, expect.objectContaining({ seed: 921 }), ownerId, instant);
    expect(repository.record?.document.userId).toBe(userId);

    const replacement = await fetch(`${baseUrl}/api/run`, { method: "POST", headers: { "content-type": "application/json", "x-run-owner": ownerId }, body: JSON.stringify({ seed: 2 }) });
    expect(replacement.status).toBe(409);
    await expect(replacement.json()).resolves.toMatchObject({ error: { code: "ACTIVE_RUN_EXISTS" } });
  });

  it("acquires the current lease before returning run data and hides data when locked", async () => {
    await repository.create(userId, createRun(921), ownerId, instant);
    const getResponse = await fetch(`${baseUrl}/api/run`, { headers: { "x-run-owner": ownerId } });
    expect(getResponse.status).toBe(200);
    await expect(getResponse.json()).resolves.toMatchObject({ run: { seed: 921 }, etag: "etag-acquired", lease: { owned: true } });
    expect(repository.acquire).toHaveBeenCalledWith(userId, ownerId, instant);

    repository.record = { ...repository.record!, document: { ...repository.record!.document, lease: { ownerId: "other-device", lastActivityAt: instant.toISOString(), expiresAt: new Date(instant.getTime() + 60_000).toISOString() } } };
    const locked = await fetch(`${baseUrl}/api/run`, { headers: { "x-run-owner": ownerId } });
    const lockedBody = await locked.json() as Record<string, unknown>;
    expect(locked.status).toBe(423);
    expect(lockedBody).not.toHaveProperty("run");
    expect(lockedBody).toMatchObject({ error: { code: "RUN_LOCKED" } });
    repository.record = null;
  });

  it("saves only validated state using If-Match and ignores body user IDs", async () => {
    await repository.create(userId, createRun(17), ownerId, instant);
    const run = createRun(88);
    const response = await fetch(`${baseUrl}/api/run`, {
      method: "PUT",
      headers: { "content-type": "application/json", "if-match": "etag-1", "x-run-owner": ownerId },
      body: JSON.stringify({ run: { ...run, userId: "not-the-authenticated-user" }, userId: "also-ignored" }),
    });

    expect(response.status).toBe(200);
    expect(repository.save).toHaveBeenCalledWith(userId, ownerId, "etag-1", expect.objectContaining({ seed: 88 }), instant);
    expect(repository.save.mock.calls[0]?.[3]).not.toHaveProperty("userId");
  });

  it("records explicit activity and owner-authorized deletion", async () => {
    await repository.create(userId, createRun(15), ownerId, instant);
    const activity = await fetch(`${baseUrl}/api/run/activity`, { method: "POST", headers: { "content-type": "application/json", "x-run-owner": ownerId }, body: "{}" });
    expect(activity.status).toBe(200);
    await expect(activity.json()).resolves.toMatchObject({ expiresAt: "2026-10-21T10:15:00.000Z" });

    const deleted = await fetch(`${baseUrl}/api/run`, { method: "DELETE", headers: { "content-type": "application/json", "x-run-owner": ownerId }, body: JSON.stringify({ reason: "abandoned" }) });
    expect(deleted.status).toBe(204);
    expect(repository.record).toBeNull();
  });

  it("rejects malformed run state, missing records, and deletion by a different owner", async () => {
    const malformed = await fetch(`${baseUrl}/api/run`, {
      method: "PUT",
      headers: { "content-type": "application/json", "if-match": "etag-1", "x-run-owner": ownerId },
      body: JSON.stringify({ run: { runId: "incomplete" } }),
    });
    expect(malformed.status).toBe(400);

    const missing = await fetch(`${baseUrl}/api/run`, {
      method: "PUT",
      headers: { "content-type": "application/json", "if-match": "etag-1", "x-run-owner": ownerId },
      body: JSON.stringify({ run: createRun(1) }),
    });
    expect(missing.status).toBe(404);

    await repository.create(userId, createRun(2), ownerId, instant);
    const wrongOwner = await fetch(`${baseUrl}/api/run`, {
      method: "DELETE",
      headers: { "content-type": "application/json", "x-run-owner": "46b87a43-b144-4665-bca6-553046104276" },
      body: JSON.stringify({ reason: "abandoned" }),
    });
    expect(wrongOwner.status).toBe(423);
    expect(repository.record).not.toBeNull();
  });

  it("returns JSON errors for malformed or oversized requests and redacts repository errors", async () => {
    const malformed = await fetch(`${baseUrl}/api/run`, { method: "POST", headers: { "content-type": "application/json", "x-run-owner": ownerId }, body: JSON.stringify({ seed: 1.25 }) });
    expect(malformed.status).toBe(400);
    await expect(malformed.json()).resolves.toMatchObject({ error: { code: "INVALID_BODY" } });

    const oversized = await fetch(`${baseUrl}/api/run`, { method: "POST", headers: { "content-type": "application/json", "x-run-owner": ownerId }, body: JSON.stringify({ seed: 1, padding: "x".repeat(270_000) }) });
    expect(oversized.status).toBe(413);
    await expect(oversized.json()).resolves.toMatchObject({ error: { code: "BODY_TOO_LARGE" } });

    repository.get.mockRejectedValueOnce(new RunStorageUnavailableError());
    const unavailable = await fetch(`${baseUrl}/api/run`, { headers: { "x-run-owner": ownerId } });
    expect(unavailable.status).toBe(503);
    const errorText = await unavailable.text();
    expect(errorText).not.toContain(userId);
    expect(errorText).not.toContain("Cosmos");
  });

  it("rejects absent verified principals and handles typed lock, conflict, and missing errors", async () => {
    const noPrincipal: RequestHandler = (_request, _response, next) => next();
    const noAuthServer = createServer(createApp({ config, authenticate: noPrincipal, repository }));
    await new Promise<void>((resolve) => noAuthServer.listen(0, "127.0.0.1", resolve));
    const address = noAuthServer.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind to a TCP port.");
    const unauthorized = await fetch(`http://127.0.0.1:${address.port}/api/run`, { headers: { "x-run-owner": ownerId } });
    expect(unauthorized.status).toBe(401);
    await new Promise<void>((resolve, reject) => noAuthServer.close((error) => error ? reject(error) : resolve()));

    await repository.create(userId, createRun(19), ownerId, instant);
    repository.save.mockRejectedValueOnce(new RunConflictError());
    const conflict = await fetch(`${baseUrl}/api/run`, { method: "PUT", headers: { "content-type": "application/json", "if-match": "old-etag", "x-run-owner": ownerId }, body: JSON.stringify({ run: createRun(19) }) });
    expect(conflict.status).toBe(409);
    repository.recordActivity.mockRejectedValueOnce(new RunNotFoundError());
    const missing = await fetch(`${baseUrl}/api/run/activity`, { method: "POST", headers: { "content-type": "application/json", "x-run-owner": ownerId }, body: "{}" });
    expect(missing.status).toBe(404);
    repository.record = null;
  });
});
