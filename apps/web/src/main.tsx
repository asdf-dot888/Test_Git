import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { GameErrorBoundary } from "./components/GameErrorBoundary.js";
import "./styles/tokens.css";
import "./styles/board.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Could not find the root element.");
}

createRoot(rootElement).render(
  <StrictMode>
    <GameErrorBoundary>
      <App />
    </GameErrorBoundary>
  </StrictMode>,
);
