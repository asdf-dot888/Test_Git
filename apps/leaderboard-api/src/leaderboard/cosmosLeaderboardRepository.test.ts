import type { Container, ItemDefinition, ItemResponse } from "@azure/cosmos";
import { describe, expect, it } from "vitest";
import type { LeaderboardRecord, RecordBestProgressInput } from "./types.js";
import { CosmosLeaderboardRepository, LeaderboardStorageError } from "./cosmosLeaderboardRepository.js";

const instant = "2026-10-26T00:00:00.000Z";

function input(overrides: Partial<RecordBestProgressInput> = {}): RecordBestProgressInput {
  return { userId: "employee-1", displayName: "Employee One", completedBattles: 3, recordedAt: instant, ...overrides };
}

function record(overrides: Partial<LeaderboardRecord> = {}): LeaderboardRecord {
  return { id: "best-progress", userId: "employee-1", displayName: "Employee One", completedBattles: 2, recordedAt: "2026-10-20T00:00:00.000Z", schemaVersion: 1, ...overrides };
}

class FakeContainer {
  readonly documents = new Map<string, { record: LeaderboardRecord; etag: string }>();
  readonly reads: Array<{ id: string; userId: string }> = [];
  readonly creates: LeaderboardRecord[] = [];
  readonly replacements: Array<{ userId: string; ifMatch?: string }> = [];
  readonly queries: Array<{ query: string; maxItemCount: number | undefined }> = [];
  queryResources: unknown[] = [];
  queryError: unknown;
  beforeNextReplace: (() => void) | undefined;
  beforeNextCreate: (() => void) | undefined;

  item(id: string, userId: string) {
    return {
      read: async <T extends ItemDefinition>() => {
        this.reads.push({ id, userId });
        const entry = this.documents.get(userId);
        if (!entry) throw { statusCode: 404 };
        return this.response<T>(entry.record, entry.etag);
      },
      replace: async <T extends ItemDefinition>(body: LeaderboardRecord, options?: { accessCondition?: { type: string; condition: string } }) => {
        this.beforeNextReplace?.();
        this.beforeNextReplace = undefined;
        const current = this.documents.get(userId);
        if (!current || options?.accessCondition?.condition !== current.etag) throw { statusCode: 412 };
        this.replacements.push({ userId, ifMatch: options.accessCondition.condition });
        const etag = `${Number(current.etag) + 1}`;
        this.documents.set(userId, { record: body, etag });
        return this.response<T>(body, etag);
      },
    };
  }

  readonly items = {
    create: async <T extends ItemDefinition>(body: LeaderboardRecord) => {
      this.beforeNextCreate?.();
      this.beforeNextCreate = undefined;
      this.creates.push(body);
      if (this.documents.has(body.userId)) throw { statusCode: 409 };
      this.documents.set(body.userId, { record: body, etag: "1" });
      return this.response<T>(body, "1");
    },
    query: (query: string, options?: { maxItemCount?: number }) => {
      this.queries.push({ query, maxItemCount: options?.maxItemCount });
      return {
        fetchAll: async () => {
          if (this.queryError) throw this.queryError;
          return { resources: this.queryResources };
        },
      };
    },
  };

  private response<T extends ItemDefinition>(value: LeaderboardRecord, etag: string): ItemResponse<T> {
    return { resource: value, etag } as unknown as ItemResponse<T>;
  }
}

function createRepository(container = new FakeContainer()) {
  return { container, repository: new CosmosLeaderboardRepository(container as unknown as Container) };
}

describe("CosmosLeaderboardRepository", () => {
  it("creates one best-progress record in the employee partition", async () => {
    const { container, repository } = createRepository();

    const result = await repository.recordBestProgress(input());

    expect(container.reads[0]).toEqual({ id: "best-progress", userId: "employee-1" });
    expect(container.creates).toEqual([record({ completedBattles: 3, recordedAt: instant })]);
    expect(result).toEqual({ record: record({ completedBattles: 3, recordedAt: instant }), updated: true });
  });

  it("replaces a higher score with an ETag condition", async () => {
    const { container, repository } = createRepository();
    container.documents.set("employee-1", { record: record(), etag: "7" });

    const result = await repository.recordBestProgress(input({ completedBattles: 5 }));

    expect(container.replacements).toEqual([{ userId: "employee-1", ifMatch: "7" }]);
    expect(result).toEqual({ record: record({ completedBattles: 5, recordedAt: instant }), updated: true });
  });

  it.each([2, 1])("preserves the existing record and timestamp for equal or lower score %i", async (completedBattles) => {
    const { container, repository } = createRepository();
    const existing = record({ displayName: "Stored Name", completedBattles: 2 });
    container.documents.set("employee-1", { record: existing, etag: "3" });

    const result = await repository.recordBestProgress(input({ completedBattles, recordedAt: instant }));

    expect(result).toEqual({ record: existing, updated: false });
    expect(container.replacements).toHaveLength(0);
  });

  it("re-reads after an ETag conflict and does not overwrite a higher concurrent score", async () => {
    const { container, repository } = createRepository();
    container.documents.set("employee-1", { record: record({ completedBattles: 2 }), etag: "1" });
    container.beforeNextReplace = () => {
      container.documents.set("employee-1", { record: record({ completedBattles: 7, displayName: "Concurrent Name" }), etag: "2" });
    };

    const result = await repository.recordBestProgress(input({ completedBattles: 5 }));

    expect(result).toEqual({ record: record({ completedBattles: 7, displayName: "Concurrent Name" }), updated: false });
    expect(container.reads).toHaveLength(2);
    expect(container.documents.get("employee-1")?.record.completedBattles).toBe(7);
  });

  it("re-reads after a create conflict caused by a concurrent first submission", async () => {
    const { container, repository } = createRepository();
    container.beforeNextCreate = () => {
      container.documents.set("employee-1", { record: record({ completedBattles: 6 }), etag: "1" });
    };

    const result = await repository.recordBestProgress(input({ completedBattles: 4 }));

    expect(result).toEqual({ record: record({ completedBattles: 6 }), updated: false });
    expect(container.reads).toHaveLength(2);
  });

  it("queries at most ten records in deterministic score and timestamp order and strips Cosmos metadata", async () => {
    const { container, repository } = createRepository();
    container.queryResources = Array.from({ length: 12 }, (_, index) => ({
      ...record({ userId: `employee-${index}`, completedBattles: 12 - index }),
      _etag: `etag-${index}`,
      _rid: `rid-${index}`,
    }));

    const result = await repository.getTopTen();

    expect(container.queries).toEqual([{
      query: "SELECT TOP 10 * FROM c ORDER BY c.completedBattles DESC, c.recordedAt ASC",
      maxItemCount: 10,
    }]);
    expect(result).toHaveLength(10);
    expect(result[0]).toEqual(record({ userId: "employee-0", completedBattles: 12 }));
    expect(result[0]).not.toHaveProperty("_etag");
  });

  it("maps storage failures to a generic error without exposing Cosmos details", async () => {
    const { container, repository } = createRepository();
    container.queryError = new Error("secret-key and account details");

    await expect(repository.getTopTen()).rejects.toBeInstanceOf(LeaderboardStorageError);
    await expect(repository.getTopTen()).rejects.not.toThrow("secret-key");
  });
});
