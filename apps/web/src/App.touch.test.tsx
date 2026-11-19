// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { createRun, type PlayerClass } from "@board-game/game-core";
import { GameSessionView } from "./App.js";
import { renderWithTestAuth } from "./App.testUtils.js";
import type { LocalRunController } from "./game/useLocalRun.js";

function makeReadySync(run = createRun(14)): LocalRunController {
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

function battleRun(cardId: string, playerClass: PlayerClass = "warrior") {
  const run = createRun(940, playerClass);
  const battle = run.battle!;
  battle.hand = [{ instanceId: "card", cardId }];
  battle.playerMana = { current: 10, max: 10, temporary: 0 };
  battle.enemyHero.health = 30;
  battle.enemyHero.maxHealth = 30;
  battle.enemyBoard = [{ instanceId: "enemy-0", cardId: "ash-wolf", owner: "enemy", attack: 1, health: 10, maxHealth: 10, summonedTurn: 0, hasAttacked: false }];
  battle.playerBoard = [{ instanceId: "friendly", cardId: "ash-wolf", owner: "player", attack: 1, health: 10, maxHealth: 10, summonedTurn: 0, hasAttacked: false }];
  return run;
}

const finger = (element: Element, type: "pointerDown" | "pointerMove" | "pointerUp", x: number, y: number) => {
  fireEvent[type](element, { pointerType: "touch", pointerId: 3, clientX: x, clientY: y });
};

function touchDrag(element: Element, targetSelector: string) {
  document.elementFromPoint = vi.fn(() => document.querySelector(targetSelector));
  finger(element, "pointerDown", 120, 600);
  finger(element, "pointerMove", 120, 350);
  finger(element, "pointerUp", 120, 350);
}

function touchTap(element: Element) {
  fireEvent.pointerDown(element, { pointerType: "touch" });
  fireEvent.pointerUp(element, { pointerType: "touch" });
  fireEvent.click(element);
}

const manaLabel = () => document.querySelector(".player-toolbar .mana-display")?.getAttribute("aria-label");

beforeEach(() => {
  window.localStorage.setItem("board-card-roguelike:tutorial:v1:test-employee", JSON.stringify({
    schemaVersion: 1, userId: "test-employee", completed: true, completedAt: new Date().toISOString(),
  }));
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  Reflect.deleteProperty(document, "elementFromPoint");
});

describe("touch play through the whole game screen", () => {
  it("casts a targeted spell by dragging the card onto an enemy minion", async () => {
    renderWithTestAuth(<GameSessionView sync={makeReadySync(battleRun("soul-lance"))} />);
    enterActiveEncounter();
    const card = (await screen.findByRole("button", { name: /영혼 창/ })) as HTMLElement;

    touchDrag(card, ".lane-enemy .lane-slot[data-drop-target='minion:enemy:enemy-0']");
    await waitFor(() => expect(screen.queryByRole("button", { name: /영혼 창/ })).toBeNull());
    expect(manaLabel()).toBe("마나 8/10");
    expect(document.querySelector(".lane-enemy .minion-stats b:last-child")?.textContent).toContain("7");
  });

  it("plays a minion card by dragging it onto an empty slot", async () => {
    renderWithTestAuth(<GameSessionView sync={makeReadySync(battleRun("ash-wolf"))} />);
    enterActiveEncounter();
    await waitFor(() => expect(document.querySelector(".hand-cards .game-card")).toBeTruthy());
    const card = document.querySelector<HTMLElement>(".hand-cards .game-card")!;
    expect(card.textContent).toContain("잿빛 늑대");

    touchDrag(card, ".lane-player .lane-slot[data-drop-target='slot:1']");
    await waitFor(() => expect(document.querySelectorAll(".lane-player .minion-card")).toHaveLength(2));
    expect(document.querySelectorAll(".hand-cards .game-card")).toHaveLength(0);
    expect(manaLabel()).toBe("마나 9/10");
  });

  it("does not select or cast a card from a plain touch tap, only open its details", async () => {
    renderWithTestAuth(<GameSessionView sync={makeReadySync(battleRun("soul-lance"))} />);
    enterActiveEncounter();
    touchTap(await screen.findByRole("button", { name: /영혼 창/ }));

    expect(screen.getByRole("dialog", { name: /영혼 창/ })).toBeTruthy();
    expect(manaLabel()).toBe("마나 10/10");
    expect(document.querySelector(".lane-enemy .minion-card.is-targetable")).toBeNull();
  });

  it("attacks by dragging a ready minion onto an enemy minion", async () => {
    const run = battleRun("soul-lance");
    run.battle!.playerBoard[0]!.summonedTurn = 0;
    run.battle!.turnNumber = 2;
    renderWithTestAuth(<GameSessionView sync={makeReadySync(run)} />);
    enterActiveEncounter();
    await screen.findByRole("button", { name: /영혼 창/ });

    touchDrag(document.querySelector(".lane-player .minion-card")!, ".lane-enemy .lane-slot[data-drop-target='minion:enemy:enemy-0']");
    await waitFor(() => expect(document.querySelector(".lane-enemy .minion-stats b:last-child")?.textContent).toContain("9"));
  });

  it("lets the Assassin pick the hero power target with a tap: button first, then the target", async () => {
    renderWithTestAuth(<GameSessionView sync={makeReadySync(battleRun("soul-lance", "assassin"))} />);
    enterActiveEncounter();
    await screen.findByRole("button", { name: /영혼 창/ });

    touchTap(document.querySelector(".hero-power-button")!);
    expect(await screen.findByText("영웅 능력 대상을 선택하세요")).toBeTruthy();
    // While choosing a target, a tap selects it instead of opening details.
    touchTap(document.querySelector(".lane-enemy .minion-card")!);
    await waitFor(() => expect(manaLabel()).toBe("마나 8/10"));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("영웅 능력 대상을 선택하세요")).toBeNull();
  });

  it("cancels the Assassin hero power target mode, after which a tap on a minion opens details again", async () => {
    renderWithTestAuth(<GameSessionView sync={makeReadySync(battleRun("soul-lance", "assassin"))} />);
    enterActiveEncounter();
    await screen.findByRole("button", { name: /영혼 창/ });

    touchTap(document.querySelector(".hero-power-button")!);
    fireEvent.click(await screen.findByRole("button", { name: "취소" }));
    expect(screen.queryByText("영웅 능력 대상을 선택하세요")).toBeNull();
    expect(manaLabel()).toBe("마나 10/10");

    touchTap(document.querySelector(".lane-enemy .minion-card-inspection")!);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
