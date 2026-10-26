import { type Container, type ItemResponse } from "@azure/cosmos";
import type { LeaderboardRecord, RecordBestProgressInput } from "./types.js";

const DOCUMENT_ID = "best-progress" as const;
const MAX_WRITE_ATTEMPTS = 5;
const TOP_TEN_QUERY = "SELECT TOP 10 * FROM c ORDER BY c.completedBattles DESC, c.recordedAt ASC";

export class LeaderboardStorageError extends Error {
  constructor() {
    super("The leaderboard storage operation failed.");
    this.name = "LeaderboardStorageError";
  }
}

type StoredRecord = {
  record: LeaderboardRecord;
  etag: string;
};

export class CosmosLeaderboardRepository {
  constructor(private readonly container: Container) {}

  async getTopTen(): Promise<LeaderboardRecord[]> {
    try {
      const response = await this.container.items
        .query<unknown>(TOP_TEN_QUERY, { maxItemCount: 10 })
        .fetchAll();
      return response.resources.slice(0, 10).map((resource) => toPublicRecord(resource));
    } catch {
      throw new LeaderboardStorageError();
    }
  }

  async recordBestProgress(input: RecordBestProgressInput): Promise<{ record: LeaderboardRecord; updated: boolean }> {
    for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt += 1) {
      const existing = await this.read(input.userId);
      if (!existing) {
        const candidate = createRecord(input);
        try {
          const response = await this.container.items.create<LeaderboardRecord>(candidate);
          return { record: toPublicRecord(response.resource), updated: true };
        } catch (error) {
          if (statusCode(error) === 409) continue;
          throw new LeaderboardStorageError();
        }
      }

      if (input.completedBattles <= existing.record.completedBattles) {
        return { record: existing.record, updated: false };
      }

      const replacement = createRecord(input);
      try {
        const response = await this.container.item(DOCUMENT_ID, input.userId).replace<LeaderboardRecord>(replacement, {
          accessCondition: { type: "IfMatch", condition: existing.etag },
        });
        return { record: toPublicRecord(response.resource), updated: true };
      } catch (error) {
        if (statusCode(error) === 412) continue;
        throw new LeaderboardStorageError();
      }
    }

    throw new LeaderboardStorageError();
  }

  private async read(userId: string): Promise<StoredRecord | null> {
    let response: ItemResponse<LeaderboardRecord>;
    try {
      response = await this.container.item(DOCUMENT_ID, userId).read<LeaderboardRecord>();
    } catch (error) {
      if (statusCode(error) === 404) return null;
      throw new LeaderboardStorageError();
    }

    if (!response.resource) return null;
    const record = toPublicRecord(response.resource);
    if (record.id !== DOCUMENT_ID || record.userId !== userId) throw new LeaderboardStorageError();
    const etag = response.etag ?? (response.resource as LeaderboardRecord & { _etag?: string })._etag;
    if (!etag) throw new LeaderboardStorageError();
    return { record, etag };
  }
}

function createRecord(input: RecordBestProgressInput): LeaderboardRecord {
  return {
    id: DOCUMENT_ID,
    userId: input.userId,
    displayName: input.displayName,
    completedBattles: input.completedBattles,
    recordedAt: input.recordedAt,
    schemaVersion: 1,
  };
}

function toPublicRecord(value: unknown): LeaderboardRecord {
  if (typeof value !== "object" || value === null) throw new LeaderboardStorageError();
  const candidate = value as Partial<LeaderboardRecord>;
  if (candidate.id !== DOCUMENT_ID
    || typeof candidate.userId !== "string" || !candidate.userId
    || typeof candidate.displayName !== "string" || !candidate.displayName
    || typeof candidate.completedBattles !== "number" || !Number.isInteger(candidate.completedBattles)
    || candidate.completedBattles < 1 || candidate.completedBattles > 12
    || typeof candidate.recordedAt !== "string" || Number.isNaN(Date.parse(candidate.recordedAt))
    || candidate.schemaVersion !== 1) {
    throw new LeaderboardStorageError();
  }
  return {
    id: candidate.id,
    userId: candidate.userId,
    displayName: candidate.displayName,
    completedBattles: candidate.completedBattles,
    recordedAt: candidate.recordedAt,
    schemaVersion: candidate.schemaVersion,
  };
}

function statusCode(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("statusCode" in error)) return undefined;
  return typeof error.statusCode === "number" ? error.statusCode : undefined;
}
