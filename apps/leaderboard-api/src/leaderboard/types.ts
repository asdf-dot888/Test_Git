export type RunDifficulty = "normal" | "hard";

export type LeaderboardRecord = {
  id: "best-progress" | "best-progress:hard";
  userId: string;
  displayName: string;
  difficulty: RunDifficulty;
  completedBattles: number;
  recordedAt: string;
  schemaVersion: 2;
};

export type LeaderboardPrincipal = {
  userId: string;
  displayName: string;
  tenantId: string;
};

export type RecordBestProgressInput = {
  userId: string;
  displayName: string;
  difficulty: RunDifficulty;
  completedBattles: number;
  recordedAt: string;
};

export interface LeaderboardRepository {
  getTopTen(difficulty: RunDifficulty): Promise<LeaderboardRecord[]>;
  recordBestProgress(input: RecordBestProgressInput): Promise<{
    record: LeaderboardRecord;
    updated: boolean;
  }>;
}

export type LeaderboardTokenVerifier = (accessToken: string) => Promise<LeaderboardPrincipal>;
