// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { createRun } from "@board-game/game-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GameSessionView } from "./App.js";
import { renderWithTestAuth } from "./App.testUtils.js";
import type { LocalRunController } from "./game/useLocalRun.js";

const TIPS_KEY = "board-card-roguelike:tutorial-tips:v1:test-employee";

function makeSync(run: ReturnType<typeof createRun>): LocalRunController {
  return {
    status: "ready", etag: null, expiresAt: null, message: null, run, loaded: true, loadVersion: 1,
    saveRun: vi.fn(async () => undefined), createRun: vi.fn(async () => run), replaceRun: vi.fn(async () => run),
    deleteRun: vi.fn(async () => undefined), reload: vi.fn(async () => undefined), retrySave: vi.fn(async () => undefined), retry: vi.fn(async () => undefined),
  };
}

function runWithTaunt() {
  const run = createRun(57);
  run.battle!.enemyBoard = [{ instanceId: "guard", cardId: "warrior-vanguard", owner: "enemy", attack: 1, health: 4, maxHealth: 4, summonedTurn: 0, hasAttacked: false }];
  return run;
}

function openBattle() {
  fireEvent.click(screen.getByRole("button", { name: "원정 계속하기" }));
  fireEvent.click(screen.getByRole("button", { name: /페이즈 1, 1번째 전투/ }));
}

beforeEach(() => {
  // A finished first-run tutorial, so the tips are not held back by the spotlight.
  window.localStorage.setItem("board-card-roguelike:tutorial:v1:test-employee", JSON.stringify({
    schemaVersion: 1, userId: "test-employee", completed: true, completedAt: "2026-10-30T03:00:00.000Z",
  }));
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("one-time rule tips", () => {
  it("explains taunt the first time a taunt minion is on the board and never again", async () => {
    renderWithTestAuth(<GameSessionView sync={makeSync(runWithTaunt())} />);
    openBattle();
    expect(await screen.findByRole("status", { name: "도발 안내" })).toBeTruthy();
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem(TIPS_KEY) ?? "null")?.seen).toEqual(["taunt"]));
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("status", { name: "도발 안내" })).toBeNull();
    cleanup();

    renderWithTestAuth(<GameSessionView sync={makeSync(runWithTaunt())} />);
    openBattle();
    await screen.findByRole("button", { name: /^턴 종료/ });
    expect(screen.queryByRole("status", { name: "도발 안내" })).toBeNull();
  });

  it("explains fatigue the first time the player takes fatigue damage", async () => {
    const run = createRun(58);
    run.battle!.playerFatigue = 1;
    renderWithTestAuth(<GameSessionView sync={makeSync(run)} />);
    openBattle();
    expect(await screen.findByRole("status", { name: "탈진 안내" })).toBeTruthy();
  });
});
