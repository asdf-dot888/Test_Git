import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { AuthConfigurationPage } from "./auth/AuthConfigurationPage.js";
import { buildMsalConfig, readAuthConfig } from "./auth/authConfig.js";
import { GameErrorBoundary } from "./components/GameErrorBoundary.js";
import "./styles/tokens.css";
import "./styles/board.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Could not find the root element.");
}

const root = createRoot(rootElement);
const auth = readAuthConfig();

if (!auth.config) {
  root.render(<AuthConfigurationPage missing={auth.missing} />);
} else {
  root.render(<main className="auth-screen"><p role="status">로그인 설정을 준비하고 있습니다.</p></main>);
  void Promise.all([
    import("@azure/msal-browser"),
    import("@azure/msal-react"),
    import("./auth/AuthProvider.js"),
  ]).then(async ([msalBrowser, msalReact, authProvider]) => {
    const msalInstance = new msalBrowser.PublicClientApplication(buildMsalConfig(auth.config!));
    await msalInstance.initialize();
    root.render(
      <StrictMode>
        <msalReact.MsalProvider instance={msalInstance}>
          <authProvider.AuthProvider config={auth.config!}>
            <authProvider.RequireAuth>
              <GameErrorBoundary><App /></GameErrorBoundary>
            </authProvider.RequireAuth>
          </authProvider.AuthProvider>
        </msalReact.MsalProvider>
      </StrictMode>,
    );
  }).catch(() => {
    root.render(<AuthConfigurationPage error="Microsoft Entra 로그인 라이브러리를 초기화하지 못했습니다. 환경 설정을 확인한 뒤 페이지를 새로고침하세요." />);
  });
}
