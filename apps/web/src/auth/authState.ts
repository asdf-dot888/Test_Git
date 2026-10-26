import { createContext } from "react";
import { InteractionRequiredAuthError, type AccountInfo, type IPublicClientApplication, type SilentRequest } from "@azure/msal-browser";

export async function acquireLeaderboardAccessToken(
  instance: IPublicClientApplication,
  account: AccountInfo | null,
  request: Pick<SilentRequest, "scopes">,
  allowInteraction = true,
): Promise<string> {
  if (!account) throw new Error("Sign in with your company account to view the leaderboard.");
  let result;
  try {
    result = await instance.acquireTokenSilent({ ...request, account });
  } catch (error) {
    if (!(error instanceof InteractionRequiredAuthError)) throw error;
    if (!allowInteraction) throw error;
    result = await instance.acquireTokenPopup({ ...request, account });
  }
  if (!result.accessToken) throw new Error("The leaderboard access token was empty.");
  return result.accessToken;
}

export interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  displayName: string | null;
  getLeaderboardAccessToken(allowInteraction?: boolean): Promise<string>;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
