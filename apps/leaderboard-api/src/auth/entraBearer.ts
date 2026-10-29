import { createRemoteJWKSet, decodeJwt, errors, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from "jose";
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
  const v1Issuer = `https://sts.windows.net/${options.tenantId}/`;
  const v2Issuer = `https://login.microsoftonline.com/${options.tenantId}/v2.0`;
  const v1ResolveKey = keyResolver ?? createRemoteJWKSet(
    new URL(`https://login.microsoftonline.com/${options.tenantId}/discovery/keys`),
  );
  const v2ResolveKey = keyResolver ?? createRemoteJWKSet(
    new URL(`https://login.microsoftonline.com/${options.tenantId}/discovery/v2.0/keys`),
  );

  return async (accessToken: string): Promise<LeaderboardPrincipal> => {
    let tokenVersion: unknown;
    try {
      tokenVersion = decodeJwt(accessToken).ver;
    } catch {
      throw new EntraTokenError(401, "INVALID_ACCESS_TOKEN", "A valid company access token is required.");
    }
    const isV1Token = tokenVersion === "1.0";
    const issuer = isV1Token ? v1Issuer : v2Issuer;
    const resolveKey = isV1Token ? v1ResolveKey : v2ResolveKey;

    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(accessToken, resolveKey, {
        algorithms: ["RS256"],
        audience: [options.audience, `api://${options.audience}`],
        issuer,
        requiredClaims: ["aud", "exp", "iss"],
      }));
    } catch (error) {
      if (error instanceof errors.JWTClaimValidationFailed && error.claim === "aud") {
        throw new EntraTokenError(403, "INVALID_AUDIENCE", "This company account cannot access the API.");
      }
      const joseCode = error && typeof error === "object" && "code" in error
        && typeof error.code === "string" && /^[A-Z0-9_]{1,80}$/.test(error.code)
        ? error.code
        : error instanceof Error ? error.name : "UNKNOWN_TOKEN_ERROR";
      const failedClaim = error instanceof errors.JWTClaimValidationFailed
        && ["iss", "exp", "nbf", "iat"].includes(error.claim)
        ? error.claim
        : "none";
      console.warn(`[leaderboard-auth] JWT verification failed: ${joseCode}; claim=${failedClaim}`);
      throw new EntraTokenError(401, "ACCESS_TOKEN_REJECTED", "A valid company access token is required.");
    }

    const tokenTenant = payload.tid;
    const objectId = payload.oid;
    const displayName = payload.name ?? payload.preferred_username ?? payload.upn;
    const scopes = typeof payload.scp === "string" ? payload.scp.split(/\s+/).filter(Boolean) : [];

    if (tokenTenant !== options.tenantId) {
      throw new EntraTokenError(403, "TENANT_MISMATCH", "This company account cannot access the API.");
    }
    if (typeof objectId !== "string" || objectId.trim().length === 0
      || typeof displayName !== "string" || displayName.trim().length === 0) {
      const missingClaims = [
        typeof objectId === "string" && objectId.trim().length > 0 ? null : "oid",
        typeof displayName === "string" && displayName.trim().length > 0 ? null : "name",
      ].filter((claim): claim is string => claim !== null);
      console.warn(`[leaderboard-auth] required identity claim missing: ${missingClaims.join(",")}`);
      throw new EntraTokenError(401, "IDENTITY_CLAIM_MISSING", "A valid company access token is required.");
    }
    if (!scopes.includes("leaderboard.access")) {
      throw new EntraTokenError(403, "INSUFFICIENT_SCOPE", "This company account cannot access the API.");
    }

    return { userId: objectId, displayName, tenantId: tokenTenant };
  };
}
