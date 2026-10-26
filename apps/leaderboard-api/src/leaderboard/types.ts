export type LeaderboardRecord = {
  id: "best-progress";
  userId: string;
  displayName: string;
  completedBattles: number;
  recordedAt: string;
  schemaVersion: 1;
};

export type LeaderboardPrincipal = {
  userId: string;
  displayName: string;
  tenantId: string;
};

export type RecordBestProgressInput = {
  userId: string;
  displayName: string;
  completedBattles: number;
  recordedAt: string;
};

export interface LeaderboardRepository {
  getTopTen(): Promise<LeaderboardRecord[]>;
  recordBestProgress(input: RecordBestProgressInput): Promise<{
    record: LeaderboardRecord;
    updated: boolean;
  }>;
}

export type LeaderboardTokenVerifier = (accessToken: string) => Promise<LeaderboardPrincipal>;
