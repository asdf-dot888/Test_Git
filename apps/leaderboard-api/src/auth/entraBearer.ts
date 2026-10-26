import { createRemoteJWKSet, errors, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from "jose";
import type { LeaderboardPrincipal, LeaderboardTokenVerifier } from "../leaderboard/types.js";

export type EntraTokenOptions = {
  tenantId: string;
  audience: string;
};

export class EntraTokenError extends Error {
  constructor(readonly status: 401 | 403, readonly code: string, message: string) {
    super(message);
    this.name = "EntraTokenError";
  }
}

export function createEntraTokenVerifier(
  options: EntraTokenOptions,
  keyResolver?: JWTVerifyGetKey,
): LeaderboardTokenVerifier {
  const issuer = `https://login.microsoftonline.com/${options.tenantId}/v2.0`;
  const resolveKey = keyResolver ?? createRemoteJWKSet(
    new URL(`https://login.microsoftonline.com/${options.tenantId}/discovery/v2.0/keys`),
  );

  return async (accessToken: string): Promise<LeaderboardPrincipal> => {
    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(accessToken, resolveKey, {
        algorithms: ["RS256"],
        audience: options.audience,
        issuer,
        requiredClaims: ["aud", "exp", "iss"],
      }));
    } catch (error) {
      if (error instanceof errors.JWTClaimValidationFailed && error.claim === "aud") {
        throw new EntraTokenError(403, "INVALID_AUDIENCE", "This company account cannot access the API.");
      }
      throw new EntraTokenError(401, "UNAUTHENTICATED", "A valid company access token is required.");
    }

    const tokenTenant = payload.tid;
    const objectId = payload.oid;
    const displayName = payload.name;
    const scopes = typeof payload.scp === "string" ? payload.scp.split(/\s+/).filter(Boolean) : [];

    if (tokenTenant !== options.tenantId) {
      throw new EntraTokenError(403, "TENANT_MISMATCH", "This company account cannot access the API.");
    }
    if (typeof objectId !== "string" || objectId.trim().length === 0
      || typeof displayName !== "string" || displayName.trim().length === 0) {
      throw new EntraTokenError(401, "UNAUTHENTICATED", "A valid company access token is required.");
    }
    if (!scopes.includes("leaderboard.access")) {
      throw new EntraTokenError(403, "INSUFFICIENT_SCOPE", "This company account cannot access the API.");
    }

    return { userId: objectId, displayName, tenantId: tokenTenant };
  };
}
