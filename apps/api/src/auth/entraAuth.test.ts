import express, { type RequestHandler } from "express";
import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from "jose";
import { createEntraAuth, type AuthenticatedRequest, type JwtKeyResolver } from "./entraAuth.js";

const tenantId = "tenant-123";
const audience = "api://game-api";
const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`;
const config = { entraTenantId: tenantId, entraApiAudience: audience };

describe("Entra bearer authentication", () => {
  let privateKey: CryptoKey;
  let keyResolver: JwtKeyResolver;
  let server: Server;
  let baseUrl: string;

  async function token(overrides: Record<string, unknown> = {}, tokenOptions: { issuer?: string; audience?: string; expired?: boolean } = {}) {
    const now = Math.floor(Date.now() / 1000);
    const payload = { tid: tenantId, oid: "employee-oid-42", name: "Company Player", ...overrides };
    const builder = new SignJWT(payload)
      .setProtectedHeader({ alg: "RS256", kid: "test-signing-key" })
      .setIssuer(tokenOptions.issuer ?? issuer)
      .setAudience(tokenOptions.audience ?? audience)
      .setIssuedAt(tokenOptions.expired ? now - 120 : now)
      .setExpirationTime(tokenOptions.expired ? now - 60 : now + 300);
    return builder.sign(privateKey);
  }

  beforeAll(async () => {
    const pair = await generateKeyPair("RS256", { modulusLength: 2048 });
    privateKey = pair.privateKey;
    const jwk = await exportJWK(pair.publicKey);
    const signingJwk: JWK = { ...jwk, kid: "test-signing-key", alg: "RS256", use: "sig" };
    keyResolver = createLocalJWKSet({ keys: [signingJwk] });

    const app = express();
    const authenticate: RequestHandler = createEntraAuth(config, keyResolver);
    app.get("/api/run", authenticate, (request, response) => {
      response.json((request as AuthenticatedRequest).authUser);
    });
    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server failed to bind.");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  it("rejects missing or client-supplied identity headers", async () => {
    const response = await fetch(`${baseUrl}/api/run`, { headers: { "x-user-id": "attacker-controlled" } });
    expect(response.status).toBe(401);
  });

  it("derives the principal from a valid signed token oid", async () => {
    const accessToken = await token();
    const response = await fetch(`${baseUrl}/api/run`, { headers: { authorization: `Bearer ${accessToken}` } });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ userId: "employee-oid-42", tenantId, displayName: "Company Player" });
  });

  it("rejects wrong tenant and audience with 403", async () => {
    const wrongTenant = await token({ tid: "other-tenant" });
    const wrongAudience = await token({}, { audience: "api://other-api" });
    const tenantResponse = await fetch(`${baseUrl}/api/run`, { headers: { authorization: `Bearer ${wrongTenant}` } });
    const audienceResponse = await fetch(`${baseUrl}/api/run`, { headers: { authorization: `Bearer ${wrongAudience}` } });
    expect(tenantResponse.status).toBe(403);
    expect(audienceResponse.status).toBe(403);
  });

  it("rejects wrong issuer, expired tokens, malformed tokens, and missing oid", async () => {
    const wrongIssuer = await token({}, { issuer: "https://sts.windows.net/other-tenant/" });
    const expired = await token({}, { expired: true });
    const missingOid = await token({ oid: undefined });
    const responses = await Promise.all([
      fetch(`${baseUrl}/api/run`, { headers: { authorization: `Bearer ${wrongIssuer}` } }),
      fetch(`${baseUrl}/api/run`, { headers: { authorization: `Bearer ${expired}` } }),
      fetch(`${baseUrl}/api/run`, { headers: { authorization: `Bearer ${missingOid}` } }),
      fetch(`${baseUrl}/api/run`, { headers: { authorization: "Bearer not.a.valid.jwt" } }),
    ]);
    expect(responses.map((response) => response.status)).toEqual([401, 401, 401, 401]);
  });
});
