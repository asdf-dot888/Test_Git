import { app, type HttpRequest, type HttpResponseInit } from "@azure/functions";
import { EntraTokenError } from "../auth/entraBearer.js";
import type { LeaderboardRepository, LeaderboardTokenVerifier } from "../leaderboard/types.js";
import { errorResponse, jsonResponse, progressSubmissionSchema } from "../leaderboard/validation.js";

export type LeaderboardHandlerDependencies = {
  verifyToken: LeaderboardTokenVerifier;
  repository: LeaderboardRepository;
  now?: () => Date;
  isConfigured?: () => boolean;
};

export function createLeaderboardHandlers(dependencies: LeaderboardHandlerDependencies) {
  const now = dependencies.now ?? (() => new Date());
  const isConfigured = dependencies.isConfigured ?? (() => true);

  const authenticate = async (request: HttpRequest) => {
    if (!isConfigured()) return { response: errorResponse("API_NOT_CONFIGURED", "The leaderboard API is not configured.", 503) };
    const accessToken = request.headers.get("x-leaderboard-access-token");
    if (!accessToken || !/^[A-Za-z0-9._~-]+$/.test(accessToken)) {
      const code = accessToken ? "INVALID_ACCESS_TOKEN" : "MISSING_ACCESS_TOKEN";
      console.warn(`[leaderboard-auth] rejected: ${accessToken ? "malformed_access_token_header" : "missing_access_token_header"}`);
      return { response: errorResponse(code, "A valid company access token is required.", 401) };
    }
    try {
      return { principal: await dependencies.verifyToken(accessToken) };
    } catch (error) {
      if (error instanceof EntraTokenError) {
        console.warn(`[leaderboard-auth] rejected: ${error.code}`);
        return { response: errorResponse(error.code, error.message, error.status) };
      }
      const verifierCode = error && typeof error === "object" && "code" in error
        && typeof error.code === "string" && /^[A-Z0-9_]{1,80}$/.test(error.code)
        ? error.code
        : "UNKNOWN_VERIFIER_ERROR";
      console.warn(`[leaderboard-auth] token verification failed: ${verifierCode}`);
      return { response: errorResponse("UNAUTHENTICATED", "A valid company access token is required.", 401) };
    }
  };

  const get = async (request: HttpRequest): Promise<HttpResponseInit> => {
    const authentication = await authenticate(request);
    if (authentication.response) return authentication.response;
    try {
      const items = await dependencies.repository.getTopTen();
      return jsonResponse({ items: items.slice(0, 10) });
    } catch {
      return errorResponse("LEADERBOARD_UNAVAILABLE", "The leaderboard is temporarily unavailable.", 503);
    }
  };

  const post = async (request: HttpRequest): Promise<HttpResponseInit> => {
    const authentication = await authenticate(request);
    if (authentication.response) return authentication.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("INVALID_PROGRESS", "Submit a valid completed battle count.", 400);
    }
    const parsed = progressSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("INVALID_PROGRESS", "Submit a valid completed battle count.", 400);
    }

    try {
      const result = await dependencies.repository.recordBestProgress({
        userId: authentication.principal.userId,
        displayName: authentication.principal.displayName,
        completedBattles: parsed.data.completedBattles,
        recordedAt: now().toISOString(),
      });
      return jsonResponse(result);
    } catch {
      return errorResponse("LEADERBOARD_UNAVAILABLE", "The leaderboard is temporarily unavailable.", 503);
    }
  };

  return { get, post };
}

export function registerLeaderboardFunctions(dependencies: LeaderboardHandlerDependencies) {
  const handlers = createLeaderboardHandlers(dependencies);
  app.http("leaderboardGet", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "leaderboard",
    handler: handlers.get,
  });
  app.http("leaderboardProgressPost", {
    methods: ["POST"],
    authLevel: "anonymous",
    route: "leaderboard/progress",
    handler: handlers.post,
  });
  return handlers;
}
