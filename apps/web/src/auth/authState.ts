import { InteractionRequiredAuthError, type AccountInfo, type IPublicClientApplication, type SilentRequest } from "@azure/msal-browser";
import { createContext } from "react";

export interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  displayName: string | null;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  getApiToken(): Promise<string>;
}

export class AuthRequiredError extends Error {
  constructor(message = "Sign in with your company account to continue.") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export type TokenClient = Pick<IPublicClientApplication, "acquireTokenSilent" | "acquireTokenRedirect">;

export async function getApiAccessToken(client: TokenClient, account: AccountInfo | null, request: SilentRequest): Promise<string> {
  if (!account) throw new AuthRequiredError();
  try {
    const result = await client.acquireTokenSilent({ ...request, account });
    return result.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      await client.acquireTokenRedirect({ ...request, account });
      throw new AuthRequiredError("Complete the company sign-in to continue.");
    }
    throw error;
  }
}

export const AuthContext = createContext<AuthContextValue | null>(null);
