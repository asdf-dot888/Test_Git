import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { createEntraTokenVerifier, EntraTokenError } from "./entraBearer.js";
import type { JWTVerifyGetKey } from "jose";

const tenantId = "tenant-123";
const audience = "spa-api-client-id";
const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`;

describe("Entra leaderboard access-token validation", () => {
  let privateKey: CryptoKey;
  let otherPrivateKey: CryptoKey;
  let keyResolver: JWTVerifyGetKey;
  const verify = () => createEntraTokenVerifier({ tenantId, audience }, keyResolver);

  async function token(
    overrides: Record<string, unknown> = {},
    options: { issuer?: string; audience?: string; expired?: boolean; key?: CryptoKey } = {},
  ) {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      tid: tenantId,
      oid: "employee-oid-42",
      name: "Company Player",
      scp: "leaderboard.access",
      ...overrides,
    };
    return new SignJWT(payload)
      .setProtectedHeader({ alg: "RS256", kid: "test-signing-key" })
      .setIssuer(options.issuer ?? issuer)
      .setAudience(options.audience ?? audience)
      .setIssuedAt(options.expired ? now - 120 : now)
      .setExpirationTime(options.expired ? now - 60 : now + 300)
      .sign(options.key ?? privateKey);
  }

  beforeAll(async () => {
    const [pair, otherPair] = await Promise.all([
      generateKeyPair("RS256", { modulusLength: 2048 }),
      generateKeyPair("RS256", { modulusLength: 2048 }),
    ]);
    privateKey = pair.privateKey;
    otherPrivateKey = otherPair.privateKey;
    const jwk = await exportJWK(pair.publicKey);
    const signingJwk: JWK = { ...jwk, kid: "test-signing-key", alg: "RS256", use: "sig" };
    keyResolver = createLocalJWKSet({ keys: [signingJwk] });
  });

  it("returns the principal from a correctly signed tenant token with the required scope", async () => {
    await expect(verify()(await token())).resolves.toEqual({
      userId: "employee-oid-42",
      displayName: "Company Player",
      tenantId,
    });
  });

  it("rejects malformed and expired tokens with 401", async () => {
    const expired = await token({}, { expired: true });
    const invalidSignature = await token({}, { key: otherPrivateKey });
    for (const accessToken of ["not.a.jwt", expired, invalidSignature]) {
      await expect(verify()(accessToken)).rejects.toMatchObject({ status: 401, code: "UNAUTHENTICATED" });
    }
  });

  it("rejects a wrong issuer, missing oid, or missing display name with 401", async () => {
    const wrongIssuer = await token({}, { issuer: "https://sts.windows.net/other-tenant/" });
    const missingOid = await token({ oid: undefined });
    const missingName = await token({ name: undefined });
    for (const accessToken of [wrongIssuer, missingOid, missingName]) {
      await expect(verify()(accessToken)).rejects.toMatchObject({ status: 401, code: "UNAUTHENTICATED" });
    }
  });

  it("rejects wrong audience and tenant with 403", async () => {
    const wrongAudience = await token({}, { audience: "other-api-client-id" });
    const wrongTenant = await token({ tid: "other-tenant" });
    await expect(verify()(wrongAudience)).rejects.toMatchObject({ status: 403, code: "INVALID_AUDIENCE" });
    await expect(verify()(wrongTenant)).rejects.toMatchObject({ status: 403, code: "TENANT_MISMATCH" });
  });

  it("requires leaderboard.access as a complete whitespace-delimited scope", async () => {
    const missingScope = await token({ scp: "openid profile" });
    const partialScope = await token({ scp: "leaderboard.access.extra" });
    await expect(verify()(missingScope)).rejects.toMatchObject({ status: 403, code: "INSUFFICIENT_SCOPE" });
    await expect(verify()(partialScope)).rejects.toBeInstanceOf(EntraTokenError);
    await expect(verify()(partialScope)).rejects.toMatchObject({ status: 403, code: "INSUFFICIENT_SCOPE" });
  });
});
