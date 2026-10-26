export interface LeaderboardConfig {
  entraTenantId: string;
  entraApiAudience: string;
  cosmosEndpoint: string;
  cosmosKey: string;
  cosmosDatabase: string;
  cosmosContainer: string;
}

export function loadLeaderboardConfig(
  environment: Record<string, string | undefined> = process.env,
): LeaderboardConfig {
  const entraTenantId = environment.ENTRA_TENANT_ID?.trim() ?? "";
  const entraApiAudience = environment.ENTRA_API_AUDIENCE?.trim() ?? "";
  const cosmosEndpoint = environment.COSMOS_ENDPOINT?.trim() ?? "";
  const cosmosKey = environment.COSMOS_KEY?.trim() ?? "";

  if (!entraTenantId || !entraApiAudience || !cosmosEndpoint || !cosmosKey) {
    throw new Error("Leaderboard API configuration is incomplete.");
  }

  return {
    entraTenantId,
    entraApiAudience,
    cosmosEndpoint,
    cosmosKey,
    cosmosDatabase: environment.COSMOS_DATABASE?.trim() || "mango-stone",
    cosmosContainer: environment.COSMOS_CONTAINER?.trim() || "leaderboard-progress",
  };
}
