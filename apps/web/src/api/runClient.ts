import type { RunDifficulty, RunState } from "@board-game/game-core";
import { authenticatedFetch, type ApiTokenProvider } from "../auth/apiFetch.js";

export interface ActiveRunResponse {
  run: RunState | null;
  etag?: string;
  lease?: { owned: boolean; expiresAt: string | null };
  ownerId?: string;
}

export interface RunSaveResponse {
  run: RunState;
  etag: string;
}

export interface RunActivityResponse {
  etag: string;
  expiresAt: string;
}

export class RunClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly expiresAt: string | null = null,
  ) {
    super(message);
    this.name = "RunClientError";
  }
}

export class RunClient {
  constructor(
    private readonly baseUrl: string,
    private readonly getToken: ApiTokenProvider,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  getActiveRun(ownerId: string): Promise<ActiveRunResponse> {
    return this.request("/api/run", { method: "GET", headers: { "x-run-owner": ownerId } });
  }

  createRun(seed: number, ownerId: string, difficulty: RunDifficulty = "normal"): Promise<RunSaveResponse> {
    return this.request("/api/run", {
      method: "POST",
      headers: { "content-type": "application/json", "x-run-owner": ownerId },
      body: JSON.stringify({ seed, difficulty }),
    });
  }

  saveRun(run: RunState, etag: string, ownerId: string): Promise<RunSaveResponse> {
    return this.request("/api/run", {
      method: "PUT",
      headers: { "content-type": "application/json", "if-match": etag, "x-run-owner": ownerId },
      body: JSON.stringify({ run }),
    });
  }

  recordActivity(ownerId: string): Promise<RunActivityResponse> {
    return this.request("/api/run/activity", {
      method: "POST",
      headers: { "content-type": "application/json", "x-run-owner": ownerId },
      body: "{}",
    });
  }

  async deleteRun(reason: "completed" | "abandoned", ownerId: string): Promise<void> {
    await this.request<undefined>("/api/run", {
      method: "DELETE",
      headers: { "content-type": "application/json", "x-run-owner": ownerId },
      body: JSON.stringify({ reason }),
    }, true);
  }

  private async request<T>(path: string, init: RequestInit, allowEmpty = false): Promise<T> {
    const baseUrl = this.baseUrl.replace(/\/+$/, "");
    const response = await authenticatedFetch(`${baseUrl}${path}`, init, this.getToken, this.fetchImpl);
    if (allowEmpty && response.status === 204) return undefined as T;
    const body = await response.json().catch(() => null) as { error?: { code?: string; message?: string; expiresAt?: string } } | null;
    if (!response.ok) {
      throw new RunClientError(
        response.status,
        body?.error?.code ?? "REQUEST_FAILED",
        body?.error?.message ?? "The expedition request could not be completed.",
        body?.error?.expiresAt ?? null,
      );
    }
    if (!body) throw new RunClientError(response.status, "INVALID_RESPONSE", "The server returned an invalid response.");
    return body as T;
  }
}

export function getTabOwnerId(storage: Pick<Storage, "getItem" | "setItem">, createId: () => string): string {
  const existing = storage.getItem("board-game:run-owner");
  if (existing) return existing;
  const ownerId = createId();
  storage.setItem("board-game:run-owner", ownerId);
  return ownerId;
}
