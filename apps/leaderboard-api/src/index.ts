import { createEntraTokenVerifier } from "./auth/entraBearer.js";
import { loadLeaderboardConfig } from "./config/env.js";
import { createCosmosClient, getLeaderboardContainer } from "./db/cosmosLeaderboardClient.js";
import { registerLeaderboardFunctions } from "./functions/leaderboard.js";
import { CosmosLeaderboardRepository } from "./leaderboard/cosmosLeaderboardRepository.js";
import type { LeaderboardRepository } from "./leaderboard/types.js";

let repository: LeaderboardRepository | undefined;

function getRepository(): LeaderboardRepository {
  if (repository) return repository;
  const config = loadLeaderboardConfig();
  const client = createCosmosClient(config);
  repository = new CosmosLeaderboardRepository(getLeaderboardContainer(client, config));
  return repository;
}

const lazyRepository: LeaderboardRepository = {
  getTopTen: () => getRepository().getTopTen(),
  recordBestProgress: (input) => getRepository().recordBestProgress(input),
};

function isConfigured(): boolean {
  try {
    loadLeaderboardConfig();
    return true;
  } catch {
    return false;
  }
}

registerLeaderboardFunctions({
  verifyToken: createEntraTokenVerifier({
    tenantId: process.env.ENTRA_TENANT_ID?.trim() ?? "",
    audience: process.env.ENTRA_API_AUDIENCE?.trim() ?? "",
  }),
  repository: lazyRepository,
  isConfigured,
});
