// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { createRun } from "@board-game/game-core";
import { GameSessionView } from "./App.js";
import { renderWithTestAuth } from "./App.testUtils.js";
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

function makeSync(run: ReturnType<typeof createRun> | null = null): LocalRunController {
  return {
    status: "ready", etag: run ? "etag" : null, expiresAt: null, message: null, run, loaded: true, loadVersion: run ? 1 : 0,
    saveRun: vi.fn(async () => undefined), createRun: vi.fn(async (seed: number) => createRun(seed)),
    replaceRun: vi.fn(async (_reason: "completed" | "abandoned", seed: number) => createRun(seed)),
    deleteRun: vi.fn(async () => undefined), reload: vi.fn(async () => undefined), retrySave: vi.fn(async () => undefined), retry: vi.fn(async () => undefined),
  };
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe("expedition roadmap navigation", () => {
  it("opens the roadmap for a new run and starts the active encounter only after selection", async () => {
    vi.stubGlobal("Audio", FakeAudio);
    const sync = makeSync();
    renderWithTestAuth(<GameSessionView sync={sync} />);

    fireEvent.click(screen.getByRole("button", { name: "새 원정 시작" }));
    expect(await screen.findByRole("heading", { name: "원정 경로" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "메뉴" })).toBeNull();
    expect(screen.getAllByRole("button", { name: /진행 중/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /진행 중/ }));
    expect(await screen.findByRole("button", { name: "메뉴" })).toBeTruthy();
    expect(sync.createRun).toHaveBeenCalledOnce();
  });

  it("continues an active saved battle through its active roadmap node", async () => {
    vi.stubGlobal("Audio", FakeAudio);
    const run = createRun(412);
    renderWithTestAuth(<GameSessionView sync={makeSync(run)} />);

    fireEvent.click(await screen.findByRole("button", { name: "원정 계속하기" }));
    expect(await screen.findByRole("heading", { name: "원정 경로" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /진행 중/ }));
    expect(await screen.findByRole("button", { name: "메뉴" })).toBeTruthy();
  });

  it("shows a pending reward first and reveals the next phase after a boss reward is resolved", async () => {
    vi.stubGlobal("Audio", FakeAudio);
    const run = createRun(413);
    run.encounters.forEach((encounter, index) => { encounter.status = index < 4 ? "complete" : "pending"; });
    run.battle!.status = "playerWon";
    run.battle!.enemyId = run.encounters[3]!.enemyId;
    run.completedBattles = 4;
    run.pendingReward = { tier: "boss", choices: ["dread-colossus"], encounterIndex: 3 };
    renderWithTestAuth(<GameSessionView sync={makeSync(run)} />);

    fireEvent.click(await screen.findByRole("button", { name: "원정 계속하기" }));
    expect(await screen.findByRole("heading", { name: "전리품을 선택하세요" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "원정 경로" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "보상 건너뛰기" }));
    expect(await screen.findByText("PHASE 2")).toBeTruthy();
    expect(document.querySelectorAll(".expedition-roadmap__node")).toHaveLength(4);
  });

  it("returns to the main menu without deleting the run and can reopen its roadmap", async () => {
    vi.stubGlobal("Audio", FakeAudio);
    const sync = makeSync();
    renderWithTestAuth(<GameSessionView sync={sync} />);
    fireEvent.click(screen.getByRole("button", { name: "새 원정 시작" }));
    expect(await screen.findByRole("heading", { name: "원정 경로" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "메인 메뉴" }));
    expect(await screen.findByRole("button", { name: "원정 계속하기" })).toBeTruthy();
    expect(sync.deleteRun).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "원정 계속하기" }));
    expect(await screen.findByRole("heading", { name: "원정 경로" })).toBeTruthy();
  });
});
