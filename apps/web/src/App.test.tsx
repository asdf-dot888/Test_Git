// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRun } from "@board-game/game-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App, GameSessionView } from "./App.js";
import { AuthContext, type AuthContextValue } from "./auth/authState.js";
import { renderWithTestAuth } from "./App.testUtils.js";
import type { LocalRunController } from "./game/useLocalRun.js";

const authValue: AuthContextValue = {
  isAuthenticated: true,
  isLoading: false,
  userId: "player-oid",
  displayName: "Player",
  getLeaderboardAccessToken: vi.fn(async () => "test-token"),
  signIn: vi.fn(async () => undefined),
  signOut: vi.fn(async () => undefined),
};

function makeReadySync(run = createRun(5)): LocalRunController {
  return {
    status: "ready", etag: null, expiresAt: null, message: null, run, loaded: true, loadVersion: 1,
    saveRun: vi.fn(async () => undefined), createRun: vi.fn(async () => run), replaceRun: vi.fn(async () => run),
    deleteRun: vi.fn(async () => undefined), reload: vi.fn(async () => undefined), retrySave: vi.fn(async () => undefined), retry: vi.fn(async () => undefined),
  };
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("App", () => {
  it("waits for the active run request before enabling game actions", () => {
    const markup = renderToStaticMarkup(<AuthContext.Provider value={authValue}><App /></AuthContext.Provider>);
    expect(markup).toContain('role="status"');
  });

  it("shares and persists audio settings from the main menu and roadmap", async () => {
    renderWithTestAuth(<GameSessionView sync={makeReadySync()} />);
    const openSettings = () => fireEvent.click(screen.getByRole("button", { name: "음향 설정" }));
    const closeSettings = () => fireEvent.click(screen.getByRole("button", { name: "닫기" }));

    openSettings();
    expect(screen.getByRole("dialog", { name: "음향 설정" })).toBeTruthy();
    fireEvent.change(screen.getByRole("slider", { name: "배경 음악 음량" }), { target: { value: "0.26" } });
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem("board-game:audio-settings") ?? "{}").musicVolume).toBe(0.26));
    closeSettings();
    expect(screen.queryByRole("dialog", { name: "음향 설정" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "원정 계속하기" }));
    expect(screen.getByRole("main", { name: "원정 경로" })).toBeTruthy();
    openSettings();
    expect((screen.getByRole("slider", { name: "배경 음악 음량" }) as HTMLInputElement).value).toBe("0.26");
    fireEvent.change(screen.getByRole("slider", { name: "효과음 음량" }), { target: { value: "0.33" } });
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem("board-game:audio-settings") ?? "{}").effectsVolume).toBe(0.33));
    closeSettings();
    expect(screen.getByRole("main", { name: "원정 경로" })).toBeTruthy();
  });
});
