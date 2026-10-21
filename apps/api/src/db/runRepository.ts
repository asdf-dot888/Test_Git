import { type Container, type ItemResponse } from "@azure/cosmos";
import type { RunState } from "@board-game/game-core";
import { ActiveRunExistsError, RunConflictError, RunLockedError, RunNotFoundError, RunStorageUnavailableError, UnsupportedRunSchemaError } from "./runErrors.js";
import type { ActiveRunDocument, RunRecord, SessionLease } from "./runDocument.js";

const DOCUMENT_ID = "active-run" as const;
const LEASE_DURATION_MS = 15 * 60 * 1000;

export interface RunRepository {
  get(userId: string): Promise<RunRecord | null>;
  create(userId: string, run: RunState, ownerId: string, now: Date): Promise<RunRecord>;
  save(userId: string, ownerId: string, expectedEtag: string, run: RunState, now: Date): Promise<RunRecord>;
  acquire(userId: string, ownerId: string, now: Date): Promise<RunRecord>;
  recordActivity(userId: string, ownerId: string, now: Date): Promise<RunRecord>;
  delete(userId: string, ownerId: string): Promise<void>;
}

export class CosmosRunRepository implements RunRepository {
  constructor(private readonly container: Container) {}

  async get(userId: string): Promise<RunRecord | null> {
    let response: ItemResponse<ActiveRunDocument>;
    try {
      response = await this.container.item(DOCUMENT_ID, userId).read<ActiveRunDocument>();
    } catch (error) {
      if (statusCode(error) === 404) return null;
      throw storageError();
    }
    if (!response.resource) return null;
    validateDocument(response.resource, userId);
    return toRunRecord(response);
  }

  async create(userId: string, run: RunState, ownerId: string, now: Date): Promise<RunRecord> {
    const instant = now.toISOString();
    const document: ActiveRunDocument = {
      id: DOCUMENT_ID,
      userId,
      schemaVersion: 1,
      run,
      lease: createLease(ownerId, now),
      createdAt: instant,
      updatedAt: instant,
    };
    try {
      return toRunRecord(await this.container.items.create<ActiveRunDocument>(document));
    } catch (error) {
      if (statusCode(error) === 409) throw new ActiveRunExistsError();
      throw storageError();
    }
  }

  async save(userId: string, ownerId: string, expectedEtag: string, run: RunState, now: Date): Promise<RunRecord> {
    const existing = await this.requireRecord(userId);
    requireOwner(existing.document.lease, ownerId);
    const document: ActiveRunDocument = { ...existing.document, run, updatedAt: now.toISOString() };
    try {
      const response = await this.container.item(DOCUMENT_ID, userId).replace<ActiveRunDocument>(document, {
        accessCondition: { type: "IfMatch", condition: expectedEtag },
      });
      return toRunRecord(response);
    } catch (error) {
      if (statusCode(error) === 412) throw new RunConflictError();
      throw storageError();
    }
  }

  async acquire(userId: string, ownerId: string, now: Date): Promise<RunRecord> {
    const existing = await this.requireRecord(userId);
    validateDocument(existing.document, userId);
    const lease = existing.document.lease;
    if (lease && lease.ownerId !== ownerId && now.getTime() < Date.parse(lease.expiresAt)) {
      throw new RunLockedError(lease.expiresAt);
    }
    return this.replaceLease(userId, existing, ownerId, now);
  }

  async recordActivity(userId: string, ownerId: string, now: Date): Promise<RunRecord> {
    const existing = await this.requireRecord(userId);
    validateDocument(existing.document, userId);
    requireOwner(existing.document.lease, ownerId);
    return this.replaceLease(userId, existing, ownerId, now);
  }

  async delete(userId: string, ownerId: string): Promise<void> {
    const existing = await this.requireRecord(userId);
    validateDocument(existing.document, userId);
    requireOwner(existing.document.lease, ownerId);
    try {
      await this.container.item(DOCUMENT_ID, userId).delete({
        accessCondition: { type: "IfMatch", condition: existing.etag },
      });
    } catch (error) {
      if (statusCode(error) === 404) throw new RunNotFoundError();
      if (statusCode(error) === 412) throw new RunConflictError();
      throw storageError();
    }
  }

  private async requireRecord(userId: string): Promise<RunRecord> {
    const record = await this.get(userId);
    if (!record) throw new RunNotFoundError();
    validateDocument(record.document, userId);
    return record;
  }

  private async replaceLease(userId: string, existing: RunRecord, ownerId: string, now: Date): Promise<RunRecord> {
    const document: ActiveRunDocument = {
      ...existing.document,
      lease: createLease(ownerId, now),
      updatedAt: now.toISOString(),
    };
    try {
      const response = await this.container.item(DOCUMENT_ID, userId).replace<ActiveRunDocument>(document, {
        accessCondition: { type: "IfMatch", condition: existing.etag },
      });
      return toRunRecord(response);
    } catch (error) {
      if (statusCode(error) === 412) throw new RunConflictError();
      throw storageError();
    }
  }
}

function createLease(ownerId: string, now: Date): SessionLease {
  return {
    ownerId,
    lastActivityAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + LEASE_DURATION_MS).toISOString(),
  };
}

function requireOwner(lease: SessionLease | null, ownerId: string): void {
  if (!lease || lease.ownerId !== ownerId) {
    throw new RunLockedError(lease?.expiresAt ?? "");
  }
}

function validateDocument(document: ActiveRunDocument, userId: string): void {
  if (document.userId !== userId || document.id !== DOCUMENT_ID) throw new RunStorageUnavailableError();
  if (document.schemaVersion !== 1) throw new UnsupportedRunSchemaError();
}

function toRunRecord(response: ItemResponse<ActiveRunDocument>): RunRecord {
  if (!response.resource) throw new RunStorageUnavailableError();
  validateDocument(response.resource, response.resource.userId);
  const etag = response.etag ?? (response.resource as ActiveRunDocument & { _etag?: string })._etag;
  if (!etag) throw new RunStorageUnavailableError();
  return { document: response.resource, etag };
}

function statusCode(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("statusCode" in error)) return undefined;
  const status = error.statusCode;
  return typeof status === "number" ? status : undefined;
}

function storageError(): RunStorageUnavailableError {
  return new RunStorageUnavailableError();
}
