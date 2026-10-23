// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRun } from "@board-game/game-core";
import { GameSessionView } from "./App.js";
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

function syncWith(run: ReturnType<typeof createRun>): LocalRunController {
  return {
    status: "ready", etag: "etag", expiresAt: null, message: null, run, loaded: true, loadVersion: 1,
    saveRun: vi.fn(async () => undefined), createRun: vi.fn(async () => run), replaceRun: vi.fn(async () => run),
    deleteRun: vi.fn(async () => undefined), reload: vi.fn(async () => undefined), retrySave: vi.fn(async () => undefined), retry: vi.fn(async () => undefined),
  };
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe("victory acknowledgement and rewards", () => {
  it.each(["normal", "boss"] as const)("shows the same victory step before %s rewards and the roadmap", async (tier) => {
    vi.stubGlobal("Audio", FakeAudio);
    const run = createRun(tier === "normal" ? 601 : 602);
    run.pendingVictoryAcknowledgement = true;
    run.pendingReward = { tier, choices: [tier === "normal" ? "life-thread" : "dread-colossus"], encounterIndex: 0 };
    run.battle!.status = "playerWon";
    run.encounters[0]!.status = "complete";
    run.completedBattles = 1;
    run.encounterInPhase = 1;
    render(<GameSessionView sync={syncWith(run)} />);

    fireEvent.click(await screen.findByRole("button", { name: "원정 계속하기" }));
    expect(await screen.findByRole("heading", { name: "승리" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "전리품을 선택하세요" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "확인" }));
    expect(await screen.findByRole("heading", { name: "전리품을 선택하세요" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: tier === "normal" ? /생명의 실/ : /공포의 거신/ }));
    expect(await screen.findByRole("heading", { name: "원정 경로" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /도전 가능/ })).toBeTruthy();
  });

  it("shows final boss acknowledgement before rewards and expedition completion", async () => {
    vi.stubGlobal("Audio", FakeAudio);
    const run = createRun(603);
    run.status = "victory";
    run.battle = null;
    run.completedBattles = 12;
    run.encounters.forEach((encounter) => { encounter.status = "complete"; });
    run.pendingVictoryAcknowledgement = true;
    run.pendingReward = { tier: "boss", choices: ["dread-colossus"], encounterIndex: 11 };
    render(<GameSessionView sync={syncWith(run)} />);

    fireEvent.click(await screen.findByRole("button", { name: "원정 계속하기" }));
    expect(await screen.findByRole("heading", { name: "승리" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "확인" }));
    expect(await screen.findByRole("heading", { name: "전리품을 선택하세요" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "보상 건너뛰기" }));
    expect(await screen.findByRole("heading", { name: "어둠의 군주를 물리쳤습니다" })).toBeTruthy();
  });
});
