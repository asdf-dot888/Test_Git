import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { InteractionStatus } from "@azure/msal-browser";
import { useMsal } from "@azure/msal-react";
import { createAuthRequests, type AuthConfig } from "./authConfig.js";
import { AuthContext, type AuthContextValue } from "./authState.js";
import { useAuth } from "./useAuth.js";

export function AuthProvider({ children, config }: PropsWithChildren<{ config: AuthConfig }>) {
  const { instance, accounts, inProgress } = useMsal();
  const { loginRequest } = useMemo(() => createAuthRequests(config), [config]);
  const account = instance.getActiveAccount() ?? accounts[0] ?? null;

  useEffect(() => {
    if (!instance.getActiveAccount() && account) instance.setActiveAccount(account);
  }, [account, instance]);

  const signIn = useCallback(async () => {
    await instance.loginRedirect(loginRequest);
  }, [instance, loginRequest]);

  const signOut = useCallback(async () => {
    await instance.logoutRedirect({ account });
  }, [account, instance]);

  const value = useMemo<AuthContextValue>(() => ({
    isAuthenticated: account !== null,
    isLoading: inProgress !== InteractionStatus.None,
    userId: account ? (typeof account.idTokenClaims?.oid === "string" ? account.idTokenClaims.oid : account.localAccountId) : null,
    displayName: account?.name ?? null,
    signIn,
    signOut,
  }), [account, inProgress, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function RequireAuth({ children }: PropsWithChildren) {
  const auth = useAuth();
  const [signInError, setSignInError] = useState<string | null>(null);
  const redirectAttempted = useRef(false);

  useEffect(() => {
    if (auth.isLoading || auth.isAuthenticated || redirectAttempted.current) return;
    redirectAttempted.current = true;
    void auth.signIn().catch(() => setSignInError("로그인을 시작하지 못했습니다. 버튼을 눌러 다시 시도하세요."));
  }, [auth, auth.isAuthenticated, auth.isLoading, auth.signIn]);

  if (auth.isLoading) return <main className="auth-screen"><p role="status">사내 계정 상태를 확인하고 있습니다.</p></main>;
  if (!auth.isAuthenticated) return (
    <main className="auth-screen">
      <section className="auth-card">
        <span className="eyebrow">COMPANY ACCOUNT REQUIRED</span>
        <h1>사내 계정 로그인이 필요합니다</h1>
        <p>{signInError ?? "Microsoft Entra ID 로그인 화면으로 이동합니다."}</p>
        <button className="menu-primary" type="button" onClick={() => { redirectAttempted.current = true; void auth.signIn().catch(() => setSignInError("로그인을 시작하지 못했습니다. 다시 시도하세요.")); }}>
          {signInError ? "로그인 다시 시도" : "로그인 화면 열기"}
        </button>
      </section>
    </main>
  );
  return children;
}
