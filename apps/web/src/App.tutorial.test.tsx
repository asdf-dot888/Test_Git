// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { createRun, type RunState } from "@board-game/game-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GameSessionView } from "./App.js";
import { renderWithTestAuth } from "./App.testUtils.js";
import type { LocalRunController } from "./game/useLocalRun.js";

function makeSync(run = createRun(55)): LocalRunController {
  return {
    status: "ready", etag: null, expiresAt: null, message: null, run, loaded: true, loadVersion: 1,
    saveRun: vi.fn(async () => undefined), createRun: vi.fn(async () => run), replaceRun: vi.fn(async () => run),
    deleteRun: vi.fn(async () => undefined), reload: vi.fn(async () => undefined), retrySave: vi.fn(async () => undefined), retry: vi.fn(async () => undefined),
  };
}

function makeDamagedTutorialRun() {
  const run = createRun(55);
  const battle = run.battle!;
  battle.playerHero.health = 12;
  battle.enemyHero.health -= 5;
  battle.hand = [{ instanceId: "tutorial-card", cardId: "ash-wolf" }];
  battle.playerMana.current = 5;
  battle.playerBoard = [{
    instanceId: "tutorial-ready-minion", cardId: "ash-wolf", owner: "player", attack: 2,
    health: 1, maxHealth: 4, summonedTurn: 0, hasAttacked: false,
  }];
  battle.enemyBoard = [];
  battle.enemyHand = [];
  battle.enemyStarterDeck = [];
  battle.enemyDrawPile = [];
  battle.enemyMana.current = 0;
  return run;
}

async function openActiveBattleTutorial() {
  fireEvent.click(screen.getByRole("button", { name: "원정 계속하기" }));
  fireEvent.click(screen.getByRole("button", { name: /페이즈 1, 1번째 전투/ }));
  expect(await screen.findByRole("dialog", { name: /손패와 마나 확인/ })).toBeTruthy();
}

function latestSavedRun(sync: LocalRunController, runId: string): RunState | undefined {
  return [...vi.mocked(sync.saveRun).mock.calls].reverse().map(([value]) => value).find((value) => value.runId === runId);
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("first battle tutorial lifecycle", () => {
  it("starts for an account without a completion record and skip persists completion", async () => {
    renderWithTestAuth(<GameSessionView sync={makeSync()} />);

    fireEvent.click(screen.getByRole("button", { name: "원정 계속하기" }));
    fireEvent.click(screen.getByRole("button", { name: /페이즈 1, 1번째 전투/ }));
    expect(await screen.findByRole("dialog", { name: /손패와 마나 확인/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem("board-card-roguelike:tutorial:v1:test-employee") ?? "null").completed).toBe(true));
    expect(screen.queryByRole("dialog", { name: /손패와 마나 확인/ })).toBeNull();
  });

  it("restores player-side health after skipping the first-run tutorial", async () => {
    const run = makeDamagedTutorialRun();
    const sync = makeSync(run);
    renderWithTestAuth(<GameSessionView sync={sync} />);
    await openActiveBattleTutorial();

    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));
    await waitFor(() => {
      const saved = latestSavedRun(sync, run.runId);
      expect(saved?.battle?.playerHero.health).toBe(saved?.battle?.playerHero.maxHealth);
      expect(saved?.battle?.playerBoard[0]?.health).toBe(saved?.battle?.playerBoard[0]?.maxHealth);
    });
    const saved = latestSavedRun(sync, run.runId)!;
    expect(saved.battle?.enemyHero.health).toBe(run.battle?.enemyHero.health);
    expect(saved.battle?.battleId).toBe(run.battle?.battleId);
    expect(saved.battle?.enemyBoard).toEqual(run.battle?.enemyBoard);
  });

  it("restores player-side health after normal first-run tutorial completion", async () => {
    const run = makeDamagedTutorialRun();
    const sync = makeSync(run);
    renderWithTestAuth(<GameSessionView sync={sync} />);
    await openActiveBattleTutorial();

    fireEvent.click(screen.getByRole("button", { name: "계속" }));
    fireEvent.click(document.querySelector(".game-card")!);
    expect(await screen.findByRole("dialog", { name: /첫 턴 종료/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /턴 종료/ }));
    expect(await screen.findByRole("dialog", { name: /하수인 공격/ })).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: /아군 하수인/ })[0]!);
    fireEvent.click(screen.getByRole("button", { name: /대상으로 선택/ }));
    expect(await screen.findByRole("dialog", { name: /두 번째 턴 종료/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /턴 종료/ }));

    await waitFor(() => {
      const saved = latestSavedRun(sync, run.runId);
      expect(saved?.battle?.turnNumber).toBeGreaterThan(run.battle!.turnNumber);
      expect(saved?.battle?.playerHero.health).toBe(saved?.battle?.playerHero.maxHealth);
      expect(saved?.battle?.playerBoard[0]?.health).toBe(saved?.battle?.playerBoard[0]?.maxHealth);
    });
    const saved = latestSavedRun(sync, run.runId)!;
    expect(saved.battle?.enemyHero.health).toBeLessThan(run.battle!.enemyHero.health);
    expect(saved.battle?.battleId).toBe(run.battle?.battleId);
  });

  it("does not auto-start for a completed account and exposes replay in the game guide", async () => {
    window.localStorage.setItem("board-card-roguelike:tutorial:v1:test-employee", JSON.stringify({
      schemaVersion: 1, userId: "test-employee", completed: true, completedAt: "2026-10-30T03:00:00.000Z",
    }));
    const sync = makeSync();
    const saveRunSpy = vi.spyOn(sync, "saveRun");
    renderWithTestAuth(<GameSessionView sync={sync} />);

    fireEvent.click(screen.getByRole("button", { name: "게임 방법" }));
    fireEvent.click(screen.getByRole("button", { name: "전투 튜토리얼 다시 보기" }));
    expect(await screen.findByRole("dialog", { name: /손패와 마나 확인/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));
    expect(await screen.findByRole("button", { name: "게임 방법" })).toBeTruthy();
    const replayRunId = createRun(20261030).runId;
    expect(saveRunSpy.mock.calls.some(([savedRun]) => savedRun.runId === replayRunId)).toBe(false);
    expect(JSON.parse(window.localStorage.getItem("board-card-roguelike:tutorial:v1:test-employee") ?? "null").completedAt).toBe("2026-10-30T03:00:00.000Z");
  });
});
