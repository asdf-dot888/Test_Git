import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App.js";
import { AuthContext, type AuthContextValue } from "./auth/authState.js";

const authValue: AuthContextValue = {
  isAuthenticated: true,
  isLoading: false,
  userId: "player-oid",
  displayName: "Player",
  getLeaderboardAccessToken: vi.fn(async () => "test-token"),
  signIn: vi.fn(async () => undefined),
  signOut: vi.fn(async () => undefined),
};

describe("App", () => {
  it("waits for the active run request before enabling game actions", () => {
    const markup = renderToStaticMarkup(<AuthContext.Provider value={authValue}><App /></AuthContext.Provider>);
    expect(markup).toContain('role="status"');
  });
});
