import { createElement, type ReactElement } from "react";
import { render } from "@testing-library/react";
import { AuthContext, type AuthContextValue } from "./auth/authState.js";

const testAuth: AuthContextValue = {
  isAuthenticated: true,
  isLoading: false,
  userId: "test-employee",
  displayName: "Test Employee",
  getLeaderboardAccessToken: async () => "test-token",
  signIn: async () => undefined,
  signOut: async () => undefined,
};

export function renderWithTestAuth(element: ReactElement) {
  return render(createElement(AuthContext.Provider, { value: testAuth }, element));
}
