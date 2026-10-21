import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App.js";
import { AuthContext, type AuthContextValue } from "./auth/authState.js";

const authValue: AuthContextValue = {
  isAuthenticated: true,
  isLoading: false,
  displayName: "Player",
  signIn: vi.fn(async () => undefined),
  signOut: vi.fn(async () => undefined),
  getApiToken: vi.fn(async () => "token"),
};

describe("App", () => {
  it("waits for the active run request before enabling game actions", () => {
    const markup = renderToStaticMarkup(<AuthContext.Provider value={authValue}><App /></AuthContext.Provider>);
    expect(markup).toContain('role="status"');
  });
});
