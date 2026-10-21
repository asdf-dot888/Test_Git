import type { RunState } from "@board-game/game-core";

export interface SessionLease {
  ownerId: string;
  lastActivityAt: string;
  expiresAt: string;
}

export interface ActiveRunDocument {
  id: "active-run";
  userId: string;
  schemaVersion: 1;
  run: RunState;
  lease: SessionLease | null;
  createdAt: string;
  updatedAt: string;
}

export interface RunRecord {
  document: ActiveRunDocument;
  etag: string;
}
