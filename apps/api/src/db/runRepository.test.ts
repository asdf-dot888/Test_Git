import { DefaultAzureCredential } from "@azure/identity";
import type { Container, CosmosClient, CosmosClientOptions, ItemDefinition, ItemResponse } from "@azure/cosmos";
import type { RunState } from "@board-game/game-core";
import { describe, expect, it } from "vitest";
import { createCosmosClient } from "./cosmosClient.js";
import type { ActiveRunDocument } from "./runDocument.js";
import {
  ActiveRunExistsError,
  RunConflictError,
  RunLockedError,
  RunNotFoundError,
  RunStorageUnavailableError,
  UnsupportedRunSchemaError,
} from "./runErrors.js";
import { CosmosRunRepository } from "./runRepository.js";

const start = new Date("2026-10-21T10:00:00.000Z");
const sampleRun = { runId: "run-1", status: "active" } as RunState;

class FakeContainer {
  readonly documents = new Map<string, { document: ActiveRunDocument; etag: string }>();
  readonly reads: Array<{ id: string; partitionKey: string }> = [];
  readonly creates: ActiveRunDocument[] = [];
  readonly replacements: Array<{ userId: string; ifMatch?: string }> = [];
  readonly deletions: Array<{ userId: string; ifMatch?: string }> = [];
  createError: unknown;
  replaceError: unknown;

  item(id: string, partitionKey: string) {
    return {
      read: async <T extends ItemDefinition>() => {
        this.reads.push({ id, partitionKey });
        const entry = this.documents.get(partitionKey);
        if (!entry) throw { statusCode: 404 };
        return this.response<T>(entry.document, entry.etag);
      },
      replace: async <T extends ItemDefinition>(body: ActiveRunDocument, options?: { accessCondition?: { type: string; condition: string } }) => {
        if (this.replaceError) {
          const error = this.replaceError;
          this.replaceError = undefined;
          throw error;
        }
        const current = this.documents.get(partitionKey);
        if (!current || options?.accessCondition?.condition !== current.etag) throw { statusCode: 412 };
        this.replacements.push({ userId: partitionKey, ifMatch: options?.accessCondition.condition });
        const nextEtag = `${Number(current.etag) + 1}`;
        this.documents.set(partitionKey, { document: body, etag: nextEtag });
        return this.response<T>(body, nextEtag);
      },
      delete: async (options?: { accessCondition?: { type: string; condition: string } }) => {
        const current = this.documents.get(partitionKey);
        if (!current) throw { statusCode: 404 };
        if (options?.accessCondition?.condition !== current.etag) throw { statusCode: 412 };
        this.deletions.push({ userId: partitionKey, ifMatch: options?.accessCondition.condition });
        this.documents.delete(partitionKey);
      },
    };
  }

  readonly items = {
    create: async <T extends ItemDefinition>(document: ActiveRunDocument) => {
      if (this.createError) {
        const error = this.createError;
        this.createError = undefined;
        throw error;
      }
      this.creates.push(document);
      if (this.documents.has(document.userId)) throw { statusCode: 409 };
      this.documents.set(document.userId, { document, etag: "1" });
      return this.response<T>(document, "1");
    },
  };

  private response<T extends ItemDefinition>(document: ActiveRunDocument, etag: string): ItemResponse<T> {
    return { resource: document, etag } as unknown as ItemResponse<T>;
  }
}

function repository(container = new FakeContainer()) {
  return { container, repository: new CosmosRunRepository(container as unknown as Container) };
}

describe("CosmosRunRepository", () => {
  it("reads the singleton document through the user's partition key", async () => {
    const { container, repository: repo } = repository();
    await repo.create("entra-oid", sampleRun, "device-a", start);

    const record = await repo.get("entra-oid");

    expect(container.reads.at(-1)).toEqual({ id: "active-run", partitionKey: "entra-oid" });
    expect(record?.document.userId).toBe("entra-oid");
  });

  it("creates once and never replaces an existing run", async () => {
    const { container, repository: repo } = repository();
    await repo.create("user-a", sampleRun, "device-a", start);

    await expect(repo.create("user-a", sampleRun, "device-b", start)).rejects.toBeInstanceOf(ActiveRunExistsError);
    expect(container.creates).toHaveLength(2);
    expect(container.documents.get("user-a")?.document.lease?.ownerId).toBe("device-a");
  });

  it("saves only for the lease owner and uses the caller's ETag as If-Match", async () => {
    const { container, repository: repo } = repository();
    const initial = await repo.create("user-a", sampleRun, "device-a", start);

    await expect(repo.save("user-a", "device-b", initial.etag, sampleRun, start)).rejects.toBeInstanceOf(RunLockedError);
    await repo.save("user-a", "device-a", initial.etag, sampleRun, start);
    expect(container.replacements[0]).toEqual({ userId: "user-a", ifMatch: "1" });
  });

  it("rejects a stale ETag instead of overwriting the latest state", async () => {
    const { container, repository: repo } = repository();
    const initial = await repo.create("user-a", sampleRun, "device-a", start);
    await repo.recordActivity("user-a", "device-a", new Date(start.getTime() + 1000));
    container.replaceError = { statusCode: 412 };

    await expect(repo.save("user-a", "device-a", initial.etag, sampleRun, start)).rejects.toBeInstanceOf(RunConflictError);
  });

  it("acquires a free lease and renews the same device lease", async () => {
    const { repository: repo } = repository();
    const initial = await repo.create("user-a", sampleRun, "device-a", start);
    const renewed = await repo.acquire("user-a", "device-a", new Date(start.getTime() + 5_000));

    expect(initial.document.lease?.expiresAt).toBe("2026-10-21T10:15:00.000Z");
    expect(renewed.document.lease).toEqual({ ownerId: "device-a", lastActivityAt: "2026-10-21T10:00:05.000Z", expiresAt: "2026-10-21T10:15:05.000Z" });
  });

  it("returns a typed not-found error when acquiring a missing run", async () => {
    const { repository: repo } = repository();
    await expect(repo.acquire("user-a", "device-a", start)).rejects.toBeInstanceOf(RunNotFoundError);
  });

  it("blocks another device until the exact 15-minute expiry", async () => {
    const { repository: repo } = repository();
    await repo.create("user-a", sampleRun, "device-a", start);

    await expect(repo.acquire("user-a", "device-b", new Date(start.getTime() + 15 * 60 * 1000 - 1))).rejects.toMatchObject({ name: "RunLockedError", expiresAt: "2026-10-21T10:15:00.000Z" });
    const takeover = await repo.acquire("user-a", "device-b", new Date(start.getTime() + 15 * 60 * 1000));

    expect(takeover.document.lease?.ownerId).toBe("device-b");
    expect(takeover.document.lease?.lastActivityAt).toBe("2026-10-21T10:15:00.000Z");
  });

  it("extends the lease only when recordActivity is explicitly called", async () => {
    const { repository: repo } = repository();
    const created = await repo.create("user-a", sampleRun, "device-a", start);
    const afterInput = await repo.recordActivity("user-a", "device-a", new Date(start.getTime() + 60_000));

    expect(created.document.lease?.expiresAt).toBe("2026-10-21T10:15:00.000Z");
    expect(afterInput.document.lease?.expiresAt).toBe("2026-10-21T10:16:00.000Z");
  });

  it("deletes only for the lease owner", async () => {
    const { container, repository: repo } = repository();
    await repo.create("user-a", sampleRun, "device-a", start);
    await expect(repo.delete("user-a", "device-b")).rejects.toBeInstanceOf(RunLockedError);
    await repo.delete("user-a", "device-a");

    expect(container.deletions).toHaveLength(1);
    expect(container.documents.has("user-a")).toBe(false);
  });

  it("rejects unknown schema versions and leaves their document untouched", async () => {
    const { container, repository: repo } = repository();
    await repo.create("user-a", sampleRun, "device-a", start);
    const entry = container.documents.get("user-a");
    if (!entry) throw new Error("Fake document missing.");
    entry.document.schemaVersion = 2 as 1;

    await expect(repo.get("user-a")).rejects.toBeInstanceOf(UnsupportedRunSchemaError);
    expect(container.documents.has("user-a")).toBe(true);
  });

  it("maps missing records, throttling exhaustion, and service outages without exposing SDK details", async () => {
    const { container, repository: repo } = repository();
    await expect(repo.get("missing")).resolves.toBeNull();
    container.createError = { statusCode: 429, message: "private endpoint and user payload" };
    await expect(repo.create("user-a", sampleRun, "device-a", start)).rejects.toBeInstanceOf(RunStorageUnavailableError);
    container.createError = { statusCode: 503, message: "private endpoint and user payload" };
    await expect(repo.create("user-a", sampleRun, "device-a", start)).rejects.toThrow("Run storage is temporarily unavailable.");
  });

  it("configures Cosmos SDK throttling retries with Entra credentials and no account key", () => {
    let captured: CosmosClientOptions | undefined;
    const client = {} as CosmosClient;
    createCosmosClient({ cosmosEndpoint: "https://example.documents.azure.com", cosmosDatabase: "card-roguelike", cosmosContainer: "active-runs" }, {
      createCredential: () => new DefaultAzureCredential(),
      createClient: (options) => {
        captured = options;
        return client;
      },
    });

    expect(captured?.aadCredentials).toBeInstanceOf(DefaultAzureCredential);
    expect(captured?.key).toBeUndefined();
    expect(captured?.connectionPolicy?.retryOptions).toEqual({ maxRetryAttemptCount: 9, maxWaitTimeInSeconds: 30 });
  });
});
