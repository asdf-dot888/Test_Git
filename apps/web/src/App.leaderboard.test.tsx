// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRun } from "@board-game/game-core";
import { GameSessionView } from "./App.js";
import { AuthContext, type AuthContextValue } from "./auth/authState.js";
import type { LocalRunController } from "./game/useLocalRun.js";

class FakeAudio {
  loop = false;
  volume = 1;
  currentTime = 0;
  paused = true;
  onended: (() => void) | null = null;
  constructor(public src: string) {}
  play(): Promise<void> { this.paused = false; return Promise.resolve(); }
  pause(): void { this.paused = true; }
}

const record = {
  id: "best-progress",
  userId: "employee-id",
  displayName: "테스트 직원",
  difficulty: "normal",
  completedBattles: 2,
  recordedAt: "2026-10-26T00:00:00.000Z",
  schemaVersion: 2,
};

function syncWith(run: ReturnType<typeof createRun> | null = null): LocalRunController {
  return {
    status: "ready", etag: run ? "etag" : null, expiresAt: null, message: null, run, loaded: true, loadVersion: run ? 1 : 0,
    saveRun: vi.fn(async () => undefined), createRun: vi.fn(async (seed: number) => createRun(seed)),
    replaceRun: vi.fn(async (_reason: "completed" | "abandoned", seed: number) => createRun(seed)),
    deleteRun: vi.fn(async () => undefined), reload: vi.fn(async () => undefined), retrySave: vi.fn(async () => undefined), retry: vi.fn(async () => undefined),
  };
}

function authValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    isAuthenticated: true, isLoading: false, userId: "employee-id", displayName: "테스트 직원",
    getLeaderboardAccessToken: vi.fn(async () => "access-token"), signIn: vi.fn(async () => undefined), signOut: vi.fn(async () => undefined),
    ...overrides,
  };
}

function leaderboardFetcher() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const difficulty = String(input).includes("difficulty=hard") ? "hard" : "normal";
    return Response.json({ items: [{ ...record, id: difficulty === "hard" ? "best-progress:hard" : "best-progress", difficulty }] });
  });
}

function renderGame(sync: LocalRunController, auth = authValue()) {
  return render(<AuthContext.Provider value={auth}><GameSessionView sync={sync} /></AuthContext.Provider>);
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe("game leaderboard integration", () => {
  it("submits the completed count once after victory acknowledgement and keeps rewards usable on failure", async () => {
    vi.stubGlobal("Audio", FakeAudio);
    const getLeaderboardAccessToken = vi.fn(async (allowInteraction = true) => {
      if (!allowInteraction) throw new Error("consent required");
      return "access-token";
    });
    const fetcher = vi.fn(async () => new Response("unavailable", { status: 503 }));
    vi.stubGlobal("fetch", fetcher);
    const run = createRun(710);
    run.pendingVictoryAcknowledgement = true;
    run.pendingReward = { tier: "normal", choices: ["life-thread"], encounterIndex: 0 };
    run.battle!.status = "playerWon";
    run.encounters[0]!.status = "complete";
    run.completedBattles = 1;
    const sync = syncWith(run);
    renderGame(sync, authValue({ getLeaderboardAccessToken }));

    fireEvent.click(await screen.findByRole("button", { name: "원정 계속하기" }));
    fireEvent.click(await screen.findByRole("button", { name: "확인" }));

    expect(await screen.findByRole("heading", { name: "전리품을 선택하세요" })).toBeTruthy();
    expect(getLeaderboardAccessToken).toHaveBeenCalledWith(false);
    await waitFor(() => expect(screen.getByRole("button", { name: "랭킹 제출 재시도" })).toBeTruthy());
    expect(fetcher).not.toHaveBeenCalled();
    expect(sync.saveRun).toHaveBeenCalled();
  });

  it("opens the shared leaderboard from the main menu and closes back to it", async () => {
    vi.stubGlobal("Audio", FakeAudio);
    const fetcher = leaderboardFetcher();
    vi.stubGlobal("fetch", fetcher);
    renderGame(syncWith());

    fireEvent.click(screen.getByRole("button", { name: "랭킹" }));
    expect(await screen.findByRole("heading", { name: "랭킹" })).toBeTruthy();
    expect(screen.getByText("테스트 직원")).toBeTruthy();
    expect(screen.queryByText("employee-id")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "하드" }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledWith("/api/leaderboard?difficulty=hard", expect.any(Object)));
    expect(screen.getByRole("tab", { name: "하드" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(await screen.findByRole("button", { name: "새 원정 시작" })).toBeTruthy();
  });

  it("opens the same leaderboard from the roadmap and returns to the unchanged map", async () => {
    vi.stubGlobal("Audio", FakeAudio);
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ items: [] })));
    const run = createRun(711);
    renderGame(syncWith(run));

    fireEvent.click(await screen.findByRole("button", { name: "원정 계속하기" }));
    expect(await screen.findByRole("heading", { name: "원정 경로" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "랭킹" }));
    expect(await screen.findByRole("heading", { name: "랭킹" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(await screen.findByRole("heading", { name: "원정 경로" })).toBeTruthy();
    expect(screen.getByText("완료한 전투 0 / 12")).toBeTruthy();
  });

  it("submits a Hard victory with its difficulty", async () => {
    vi.stubGlobal("Audio", FakeAudio);
    const hardRecord = { ...record, id: "best-progress:hard", difficulty: "hard" };
    const fetcher = vi.fn(async () => Response.json({ record: hardRecord, updated: true }));
    vi.stubGlobal("fetch", fetcher);
    const run = createRun(712, "warrior", "hard");
    run.pendingVictoryAcknowledgement = true;
    run.pendingReward = { tier: "normal", choices: ["life-thread"], encounterIndex: 0 };
    run.battle!.status = "playerWon";
    run.encounters[0]!.status = "complete";
    run.completedBattles = 1;
    renderGame(syncWith(run));

    fireEvent.click(await screen.findByRole("button", { name: /계속/ }));
    fireEvent.click(await screen.findByRole("button", { name: /확인/ }));

    await waitFor(() => expect(fetcher).toHaveBeenCalledWith("/api/leaderboard/progress", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ completedBattles: 1, difficulty: "hard" }),
    })));
  });
});
