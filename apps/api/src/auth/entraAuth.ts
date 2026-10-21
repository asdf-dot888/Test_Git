import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from "jose";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { AppConfig } from "../config/env.js";

export interface AuthenticatedPrincipal {
  userId: string;
  tenantId: string;
  displayName?: string;
}

export interface AuthenticatedRequest extends Request {
  authUser?: AuthenticatedPrincipal;
}

export type EntraAuthOptions = Pick<AppConfig, "entraTenantId" | "entraApiAudience">;
export type JwtKeyResolver = JWTVerifyGetKey;

const unauthorized = (response: Response) => response.status(401).set("WWW-Authenticate", "Bearer").json({ error: "unauthorized" });

export function createEntraAuth(config: EntraAuthOptions, keyResolver?: JwtKeyResolver): RequestHandler {
  const issuer = `https://login.microsoftonline.com/${config.entraTenantId}/v2.0`;
  const resolveKey = keyResolver ?? createRemoteJWKSet(
    new URL(`https://login.microsoftonline.com/${config.entraTenantId}/discovery/v2.0/keys`),
  );

  return async (request: Request, response: Response, next: NextFunction) => {
    const authorization = request.get("authorization");
    const match = authorization?.match(/^Bearer ([A-Za-z0-9._~-]+)$/i);
    if (!match) return unauthorized(response);

    try {
      const { payload } = await jwtVerify(match[1]!, resolveKey, {
        algorithms: ["RS256"],
        audience: config.entraApiAudience,
        issuer,
        requiredClaims: ["aud", "exp", "iss"],
      });
      const tokenTenant = payload.tid;
      const objectId = payload.oid;
      if (tokenTenant !== config.entraTenantId) return response.status(403).json({ error: "forbidden" });
      if (typeof objectId !== "string" || objectId.length === 0) return unauthorized(response);

      const authUser: AuthenticatedPrincipal = {
        userId: objectId,
        tenantId: tokenTenant,
        ...(typeof payload.name === "string" ? { displayName: payload.name } : {}),
      };
      (request as AuthenticatedRequest).authUser = authUser;
      return next();
    } catch (error) {
      if (error instanceof errors.JWTClaimValidationFailed && error.claim === "aud") {
        return response.status(403).json({ error: "forbidden" });
      }
      return unauthorized(response);
    }
  };
}
