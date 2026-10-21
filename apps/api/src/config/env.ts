export interface AppConfig {
  entraTenantId: string;
  entraApiAudience: string;
  cosmosEndpoint: string;
  cosmosDatabase: string;
  cosmosContainer: string;
  port: number;
}

export class ConfigurationError extends Error {
  constructor(public readonly missing: string[]) {
    super(`Missing required environment variables: ${missing.join(", ")}`);
    this.name = "ConfigurationError";
  }
}

export type Environment = Record<string, string | undefined>;

export function loadConfig(environment: Environment = process.env): AppConfig {
  const entraTenantId = environment.ENTRA_TENANT_ID?.trim() ?? "";
  const entraApiAudience = environment.ENTRA_API_AUDIENCE?.trim() ?? "";
  const missing = [
    ...(entraTenantId ? [] : ["ENTRA_TENANT_ID"]),
    ...(entraApiAudience ? [] : ["ENTRA_API_AUDIENCE"]),
  ];
  if (missing.length > 0) throw new ConfigurationError(missing);

  const port = Number(environment.PORT ?? "3001");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer from 1 to 65535.");
  }

  return {
    entraTenantId,
    entraApiAudience,
    cosmosEndpoint: environment.COSMOS_ENDPOINT?.trim() ?? "",
    cosmosDatabase: environment.COSMOS_DATABASE?.trim() || "card-roguelike",
    cosmosContainer: environment.COSMOS_CONTAINER?.trim() || "active-runs",
    port,
  };
}
