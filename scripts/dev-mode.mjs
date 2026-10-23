import process from "node:process";

export const AZURE_DEV_REQUIRED_KEYS = [
  "ENTRA_TENANT_ID",
  "ENTRA_API_AUDIENCE",
  "VITE_ENTRA_TENANT_ID",
  "VITE_ENTRA_CLIENT_ID",
  "VITE_ENTRA_API_SCOPE",
  "COSMOS_ENDPOINT",
];

export function resolveDevelopmentMode(environment = process.env) {
  const missing = AZURE_DEV_REQUIRED_KEYS.filter((key) => !environment[key]?.trim());

  if (missing.length === 0) return { mode: "azure", missing: [] };
  return { mode: "invalid", missing };
}
