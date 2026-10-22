import { randomUUID } from "node:crypto";
import { Router, type ErrorRequestHandler, type Request, type Response } from "express";
import { createRun, type RunState } from "@board-game/game-core";
import { z } from "zod";
import type { AuthenticatedRequest } from "../auth/entraAuth.js";
import type { RunRepository } from "../db/runRepository.js";
import {
  ActiveRunExistsError,
  RunConflictError,
  RunLockedError,
  RunNotFoundError,
  RunStorageUnavailableError,
  UnsupportedRunSchemaError,
} from "../db/runErrors.js";

const id = z.string().min(1).max(128);
const cardInstanceSchema = z.object({ instanceId: id, cardId: id });
const heroSchema = z.object({ id: z.enum(["player", "enemy"]), health: z.number().int().min(0).max(1000), maxHealth: z.number().int().min(1).max(1000) });
const minionSchema = z.object({
  instanceId: id,
  cardId: id,
  owner: z.enum(["player", "enemy"]),
  attack: z.number().int().min(0).max(1000),
  health: z.number().int().min(0).max(1000),
  maxHealth: z.number().int().min(1).max(1000),
  summonedTurn: z.number().int().min(0).max(100_000),
  hasAttacked: z.boolean(),
});
const battleSchema = z.object({
  battleId: id,
  turnNumber: z.number().int().min(1).max(100_000),
  activeSide: z.enum(["player", "enemy"]),
  playerHero: heroSchema,
  enemyHero: heroSchema,
  playerMana: z.object({ current: z.number().int().min(0).max(10), max: z.number().int().min(0).max(10) }),
  hand: z.array(cardInstanceSchema).max(10),
  drawPile: z.array(cardInstanceSchema).max(100),
  discardPile: z.array(cardInstanceSchema).max(100),
  playerBoard: z.array(minionSchema).max(5),
  enemyBoard: z.array(minionSchema).max(5),
  enemyId: id,
  rngState: z.number().int().safe(),
  status: z.enum(["active", "playerWon", "playerLost"]),
  pendingDiscardBeforeDraw: z.boolean().optional().transform((value) => value ?? false),
});
const runSchema = z.object({
  runId: id,
  seed: z.number().int().safe(),
  nextInstanceNumber: z.number().int().min(1).max(1_000_000),
  phase: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  encounterInPhase: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  completedBattles: z.number().int().min(0).max(12),
  status: z.enum(["active", "victory", "defeat"]),
  deck: z.array(cardInstanceSchema).max(100),
  starterDeck: z.array(cardInstanceSchema).max(100),
  battle: battleSchema.nullable(),
  turnTimer: z.object({
    battleId: id,
    turnNumber: z.number().int().min(1).max(100_000),
    deadlineAt: z.number().int().safe().nullable(),
    pausedRemainingMs: z.number().int().min(0).max(20_000).nullable(),
  }).optional().superRefine((timer, context) => {
    if (!timer) return;
    const active = timer.deadlineAt !== null && timer.pausedRemainingMs === null;
    const paused = timer.deadlineAt === null && timer.pausedRemainingMs !== null;
    const initial = timer.deadlineAt === null && timer.pausedRemainingMs === null;
    if (!active && !paused && !initial) {
      context.addIssue({ code: "custom", message: "Turn timer fields must describe either an active or paused timer." });
    }
  }).optional(),
  pendingReward: z.object({
    tier: z.enum(["normal", "boss"]),
    choices: z.array(id).max(20),
    encounterIndex: z.number().int().min(0).max(12),
  }).nullable(),
  encounters: z.array(z.object({
    phase: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    kind: z.enum(["normal", "boss"]),
    enemyId: id,
    status: z.enum(["pending", "active", "complete"]),
  })).length(12),
});

const seedBody = z.object({ seed: z.number().int().safe() });
const runBody = z.object({ run: runSchema });
const deleteBody = z.object({ reason: z.enum(["completed", "abandoned"]) });
const ownerSchema = z.string().uuid();

export function createRunRouter(deps: {
  repository: RunRepository;
  now?: () => Date;
  newOwnerId?: () => string;
  newRun?: (seed: number) => RunState;
}) {
  const router = Router();
  const now = deps.now ?? (() => new Date());
  const newOwnerId = deps.newOwnerId ?? randomUUID;
  const makeRun = deps.newRun ?? createRun;

  router.get("/", asyncRoute(async (request, response) => {
    const userId = authenticatedUserId(request);
    const ownerId = getOwnerId(request, newOwnerId);
    const current = await deps.repository.get(userId);
    if (!current) return response.status(200).json({ run: null, ownerId });
    const acquired = await deps.repository.acquire(userId, ownerId, now());
    return response.status(200).json({
      run: acquired.document.run,
      etag: acquired.etag,
      ownerId,
      lease: { owned: true, expiresAt: acquired.document.lease?.expiresAt ?? null },
    });
  }));

  router.post("/", asyncRoute(async (request, response) => {
    const userId = authenticatedUserId(request);
    const ownerId = getOwnerId(request, newOwnerId);
    const parsed = seedBody.safeParse(request.body);
    if (!parsed.success) return sendError(response, 400, "INVALID_BODY", "The run seed is invalid.");
    const created = await deps.repository.create(userId, makeRun(parsed.data.seed), ownerId, now());
    return response.status(201).json({ run: created.document.run, etag: created.etag });
  }));

  router.put("/", asyncRoute(async (request, response) => {
    const userId = authenticatedUserId(request);
    const ownerId = getOwnerId(request, newOwnerId);
    const expectedEtag = request.get("if-match")?.trim();
    const parsed = runBody.safeParse(request.body);
    if (!expectedEtag || !parsed.success) return sendError(response, 400, "INVALID_BODY", "The run state or If-Match header is invalid.");
    const { turnTimer, ...runWithoutTimer } = parsed.data.run;
    const run: RunState = turnTimer ? { ...runWithoutTimer, turnTimer } : runWithoutTimer;
    const saved = await deps.repository.save(userId, ownerId, expectedEtag, run, now());
    return response.status(200).json({ run: saved.document.run, etag: saved.etag });
  }));

  router.post("/activity", asyncRoute(async (request, response) => {
    const userId = authenticatedUserId(request);
    const ownerId = getOwnerId(request, newOwnerId);
    const parsed = z.object({}).safeParse(request.body);
    if (!parsed.success) return sendError(response, 400, "INVALID_BODY", "The activity request is invalid.");
    const record = await deps.repository.recordActivity(userId, ownerId, now());
    return response.status(200).json({ etag: record.etag, expiresAt: record.document.lease?.expiresAt ?? null });
  }));

  router.delete("/", asyncRoute(async (request, response) => {
    const userId = authenticatedUserId(request);
    const ownerId = getOwnerId(request, newOwnerId);
    const parsed = deleteBody.safeParse(request.body);
    if (!parsed.success) return sendError(response, 400, "INVALID_BODY", "The delete reason is invalid.");
    await deps.repository.delete(userId, ownerId);
    return response.status(204).end();
  }));

  router.use(apiErrorHandler);
  return router;
}

function authenticatedUserId(request: Request): string {
  const userId = (request as AuthenticatedRequest).authUser?.userId;
  if (!userId) throw new ApiRouteError(401, "UNAUTHENTICATED", "A verified company account is required.");
  return userId;
}

function getOwnerId(request: Request, fallback: () => string): string {
  const ownerId = request.get("x-run-owner") ?? fallback();
  const parsed = ownerSchema.safeParse(ownerId);
  if (!parsed.success) throw new ApiRouteError(400, "INVALID_OWNER", "The run owner identifier is invalid.");
  return parsed.data;
}

function asyncRoute(handler: (request: Request, response: Response) => Promise<unknown>) {
  return (request: Request, response: Response, next: (error?: unknown) => void) => {
    void handler(request, response).catch(next);
  };
}

class ApiRouteError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
  }
}

const apiErrorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  void _next;
  if (error instanceof ApiRouteError) return sendError(response, error.status, error.code, error.message);
  if (error instanceof ActiveRunExistsError) return sendError(response, 409, "ACTIVE_RUN_EXISTS", "An active expedition already exists.");
  if (error instanceof RunConflictError) return sendError(response, 409, "RUN_CONFLICT", "The saved expedition changed. Reload before continuing.");
  if (error instanceof RunLockedError) return response.status(423).json({ error: { code: "RUN_LOCKED", message: "Another device currently owns this expedition.", expiresAt: error.expiresAt } });
  if (error instanceof RunNotFoundError) return sendError(response, 404, "RUN_NOT_FOUND", "No active expedition was found.");
  if (error instanceof UnsupportedRunSchemaError) return sendError(response, 409, "RUN_SCHEMA_UNSUPPORTED", "This saved expedition needs a newer game version.");
  if (error instanceof RunStorageUnavailableError) return sendError(response, 503, "RUN_STORAGE_UNAVAILABLE", "Expedition storage is temporarily unavailable.");
  return sendError(response, 500, "INTERNAL_ERROR", "The request could not be completed.");
};

export function createJsonErrorHandler() {
  const handler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
    void _next;
    const status = typeof error === "object" && error !== null && "status" in error && typeof error.status === "number" ? error.status : 400;
    if (status === 413 || (typeof error === "object" && error !== null && "type" in error && error.type === "entity.too.large")) {
      return sendError(response, 413, "BODY_TOO_LARGE", "The request body must be 256 KiB or smaller.");
    }
    if (typeof error === "object" && error !== null && "type" in error && error.type === "entity.parse.failed") {
      return sendError(response, 400, "INVALID_JSON", "The request body must contain valid JSON.");
    }
    return sendError(response, 500, "INTERNAL_ERROR", "The request could not be completed.");
  };
  return handler;
}

function sendError(response: Response, status: number, code: string, message: string) {
  return response.status(status).json({ error: { code, message } });
}
