// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { createRun } from "@board-game/game-core";
import { GameSessionView } from "./App.js";
import { renderWithTestAuth } from "./App.testUtils.js";
import type { LocalRunController } from "./game/useLocalRun.js";

function makeReadySync(run = createRun(14, "warrior", "normal", { pickTurnOrder: true })): LocalRunController {
  return {
    status: "ready", etag: null, expiresAt: null, message: null, run, loaded: true, loadVersion: 1,
    saveRun: vi.fn(async () => undefined), createRun: vi.fn(async () => run), replaceRun: vi.fn(async () => run),
    deleteRun: vi.fn(async () => undefined), reload: vi.fn(async () => undefined), retrySave: vi.fn(async () => undefined), retry: vi.fn(async () => undefined),
  };
}

function enterActiveEncounter(): void {
  fireEvent.click(screen.getByRole("button", { name: "원정 계속하기" }));
  const activeEncounter = document.querySelector<HTMLButtonElement>(".expedition-roadmap__node-button[aria-current='step']");
  if (!activeEncounter) throw new Error("The current expedition encounter was not available.");
  fireEvent.click(activeEncounter);
}

function cardIndexFor(run: ReturnType<typeof createRun>, role: "first" | "second"): 1 | 2 {
  return run.battle!.turnOrderCards![0] === role ? 1 : 2;
}

beforeEach(() => {
  window.localStorage.setItem("board-card-roguelike:tutorial:v1:test-employee", JSON.stringify({
    schemaVersion: 1, userId: "test-employee", completed: true, completedAt: new Date().toISOString(),
  }));
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("turn-order pick on the game screen", () => {
  it("asks for a card before the battle, deals the hands for the first player and starts the player's turn", async () => {
    const run = createRun(14, "warrior", "normal", { pickTurnOrder: true });
    renderWithTestAuth(<GameSessionView sync={makeReadySync(run)} />);
    enterActiveEncounter();
    expect(await screen.findByRole("dialog", { name: "선후공 정하기" })).toBeTruthy();
    expect(screen.queryByText("선공")).toBeNull();
    expect((screen.getByRole("button", { name: /턴 종료/ }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: `카드 ${cardIndexFor(run, "first")} 선택` }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "선후공 정하기" })).toBeNull());
    expect(screen.getByRole("status", { name: "선후공 정하기" }).textContent).toContain("선공입니다");
    expect(document.querySelectorAll(".hand-panel .game-card, .hand-card-inspection").length).toBeGreaterThan(0);
    await waitFor(() => expect((screen.getAllByRole("button", { name: /턴 종료/ })[0] as HTMLButtonElement).disabled).toBe(false));
  });

  it("gives the second player the Coin and lets the enemy move first", async () => {
    const run = createRun(15, "warrior", "normal", { pickTurnOrder: true });
    renderWithTestAuth(<GameSessionView sync={makeReadySync(run)} />);
    enterActiveEncounter();
    fireEvent.click(await screen.findByRole("button", { name: `카드 ${cardIndexFor(run, "second")} 선택` }));
    expect(await screen.findByText(/후공입니다/)).toBeTruthy();
    expect(await screen.findByRole("button", { name: /동전/ })).toBeTruthy();
  });

  it("shows the picker in the first-run tutorial and makes the player first whichever card is picked", async () => {
    window.localStorage.clear();
    const run = createRun(16, "warrior", "normal", { pickTurnOrder: true });
    renderWithTestAuth(<GameSessionView sync={makeReadySync(run)} />);
    enterActiveEncounter();
    expect(await screen.findByRole("dialog", { name: "선후공 카드 고르기" })).toBeTruthy();
    expect(screen.getByRole("dialog", { name: "선후공 정하기" })).toBeTruthy();
    const secondIndex = run.battle!.turnOrderCards!.indexOf("second");
    fireEvent.click(screen.getByRole("button", { name: `카드 ${secondIndex + 1} 선택` }));
    expect(await screen.findByRole("dialog", { name: "마나" })).toBeTruthy();
    expect(screen.getByText("선공입니다")).toBeTruthy();
    expect(document.querySelectorAll(".hand-card-inspection").length).toBeGreaterThan(0);
  });
});
