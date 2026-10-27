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

function syncWith(run: ReturnType<typeof createRun>): LocalRunController {
  return {
    status: "ready", etag: "etag", expiresAt: null, message: null, run, loaded: true, loadVersion: 1,
    saveRun: vi.fn(async () => undefined), createRun: vi.fn(async () => run), replaceRun: vi.fn(async () => run),
    deleteRun: vi.fn(async () => undefined), reload: vi.fn(async () => undefined), retrySave: vi.fn(async () => undefined), retry: vi.fn(async () => undefined),
  };
}

function fullDeckRewardRun(seed: number) {
  const run = createRun(seed);
  for (let index = 0; index < 5; index += 1) run.deck.push({ instanceId: `overflow-${index}`, cardId: "bone-rat" });
  run.pendingVictoryAcknowledgement = true;
  run.pendingReward = { tier: "boss", choices: ["dread-colossus"], encounterIndex: 3 };
  run.battle!.status = "playerWon";
  return run;
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
    renderWithTestAuth(<GameSessionView sync={syncWith(run)} />);

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
    renderWithTestAuth(<GameSessionView sync={syncWith(run)} />);

    fireEvent.click(await screen.findByRole("button", { name: "원정 계속하기" }));
    expect(await screen.findByRole("heading", { name: "승리" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "확인" }));
    expect(await screen.findByRole("heading", { name: "전리품을 선택하세요" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "보상 건너뛰기" }));
    expect(await screen.findByRole("heading", { name: "어둠의 군주를 물리쳤습니다" })).toBeTruthy();
  });

  it("warns at 35 cards, then rewards and discards atomically to stay at 35", async () => {
    vi.stubGlobal("Audio", FakeAudio);
    const run = fullDeckRewardRun(604);
    const sync = syncWith(run);
    const savedRuns: ReturnType<typeof createRun>[] = [];
    sync.saveRun = vi.fn(async (updated) => { savedRuns.push(structuredClone(updated)); });
    renderWithTestAuth(<GameSessionView sync={sync} />);
    fireEvent.click(await screen.findByRole("button", { name: "원정 계속하기" }));
    fireEvent.click(await screen.findByRole("button", { name: "확인" }));
    expect(await screen.findByRole("alertdialog", { name: "덱이 35장으로 가득 찼습니다" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "보상 카드 선택" }));
    fireEvent.click(await screen.findByRole("button", { name: /공포의 거신/ }));
    expect(await screen.findByRole("dialog", { name: "덱에서 버릴 카드 한 장을 고르세요" })).toBeTruthy();
    expect(document.querySelector(".reward-being-added")?.textContent).toContain("공포의 거신");
    fireEvent.click(screen.getAllByRole("button", { name: /뼈 쥐/ })[0]!);
    expect(await screen.findByRole("heading", { name: "원정 경로" })).toBeTruthy();
    expect(savedRuns.at(-1)?.deck).toHaveLength(35);
    expect(savedRuns.at(-1)?.deck.some(({ cardId }) => cardId === "dread-colossus")).toBe(true);
  });

  it.each(["warning", "reward", "discard"] as const)("cancelling at the %s step leaves the 35-card deck untouched", async (step) => {
    vi.stubGlobal("Audio", FakeAudio);
    const run = fullDeckRewardRun(step === "warning" ? 605 : step === "reward" ? 606 : 607);
    const originalDeck = structuredClone(run.deck);
    const sync = syncWith(run);
    const savedRuns: ReturnType<typeof createRun>[] = [];
    sync.saveRun = vi.fn(async (updated) => { savedRuns.push(structuredClone(updated)); });
    renderWithTestAuth(<GameSessionView sync={sync} />);
    fireEvent.click(await screen.findByRole("button", { name: "원정 계속하기" }));
    fireEvent.click(await screen.findByRole("button", { name: "확인" }));
    if (step !== "warning") fireEvent.click(await screen.findByRole("button", { name: "보상 카드 선택" }));
    if (step === "discard") {
      fireEvent.click(await screen.findByRole("button", { name: /공포의 거신/ }));
      await screen.findByRole("dialog", { name: "덱에서 버릴 카드 한 장을 고르세요" });
    }
    fireEvent.click(await screen.findByRole("button", { name: "닫기" }));
    expect(await screen.findByRole("heading", { name: "원정 경로" })).toBeTruthy();
    expect(savedRuns.at(-1)?.deck).toEqual(originalDeck);
  });
});
