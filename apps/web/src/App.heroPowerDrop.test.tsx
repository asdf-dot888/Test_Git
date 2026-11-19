// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { createRun, type PlayerClass } from "@board-game/game-core";
import { GameSessionView } from "./App.js";
import { renderWithTestAuth } from "./App.testUtils.js";
import type { GameBoardProps } from "./components/GameBoard.js";
import type { DragPayload, DropTarget } from "./components/dragInteractions.js";
import type { LocalRunController } from "./game/useLocalRun.js";

/**
 * `App.handleDropInteraction` is reached through the board's `onDropInteraction`. This file replaces the board with a
 * stub that exposes the props and the battle numbers, so the drop path can be checked without the button UI.
 */
const board = vi.hoisted(() => ({ props: null as GameBoardProps | null }));
vi.mock("./components/GameBoard.js", () => ({
  GameBoard: (props: GameBoardProps) => {
    board.props = props;
    const battle = props.run.battle!;
    return (
      <main
        data-testid="stub-board"
        data-mana={battle.playerMana.current}
        data-hero-power-used={String(battle.heroPowerUsed)}
        data-enemy-minion-health={battle.enemyBoard[0]?.health ?? ""}
        data-enemy-hero-health={battle.enemyHero.health}
        data-target-mode={props.targetMode}
        data-tutorial-step={props.tutorialStep ?? ""}
      />
    );
  },
}));

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

function battleRun(playerClass: PlayerClass) {
  const run = createRun(940, playerClass);
  const battle = run.battle!;
  battle.hand = [];
  battle.playerMana = { current: 10, max: 10, temporary: 0 };
  battle.enemyHero.health = 30;
  battle.enemyHero.maxHealth = 30;
  battle.enemyBoard = [{ instanceId: "enemy-0", cardId: "ash-wolf", owner: "enemy", attack: 1, health: 10, maxHealth: 10, summonedTurn: 0, hasAttacked: false }];
  battle.playerBoard = [{ instanceId: "friendly", cardId: "ash-wolf", owner: "player", attack: 1, health: 10, maxHealth: 10, summonedTurn: 0, hasAttacked: false }];
  return run;
}

const heroPower: DragPayload = { kind: "hero-power", instanceId: "hero-power" };
const enemyMinion: DropTarget = { kind: "minion", side: "enemy", instanceId: "enemy-0" };

const stub = () => screen.getByTestId("stub-board");
const drop = (payload: DragPayload, target: DropTarget) => act(() => { board.props!.onDropInteraction!(payload, target); });

async function openBoard(playerClass: PlayerClass) {
  renderWithTestAuth(<GameSessionView sync={makeReadySync(battleRun(playerClass))} />);
  enterActiveEncounter();
  await screen.findByTestId("stub-board");
}

beforeEach(() => {
  window.localStorage.setItem("board-card-roguelike:tutorial:v1:test-employee", JSON.stringify({
    schemaVersion: 1, userId: "test-employee", completed: true, completedAt: new Date().toISOString(),
  }));
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  board.props = null;
});

describe("dropping the hero power on the game screen", () => {
  it("uses the Assassin hero power on an enemy minion: mana −2, 2 damage, no target mode left behind", async () => {
    await openBoard("assassin");
    expect(stub().getAttribute("data-mana")).toBe("10");

    drop(heroPower, enemyMinion);
    await waitFor(() => expect(stub().getAttribute("data-mana")).toBe("8"));
    expect(stub().getAttribute("data-hero-power-used")).toBe("true");
    expect(stub().getAttribute("data-enemy-minion-health")).toBe("8");
    expect(stub().getAttribute("data-target-mode")).toBe("none");
  });

  it("hits the enemy hero with the id the game expects, even while an enemy minion remains", async () => {
    await openBoard("assassin");

    drop(heroPower, { kind: "hero", side: "enemy" });
    await waitFor(() => expect(stub().getAttribute("data-enemy-hero-health")).toBe("28"));
    expect(stub().getAttribute("data-mana")).toBe("8");
    expect(stub().getAttribute("data-enemy-minion-health")).toBe("10");
  });

  it("does nothing on an invalid drop and does not switch on target mode", async () => {
    await openBoard("assassin");

    drop(heroPower, { kind: "slot", slotIndex: 1 });
    drop(heroPower, { kind: "minion", side: "player", instanceId: "friendly" });
    drop(heroPower, { kind: "hero", side: "player" });
    drop(heroPower, { kind: "minion", side: "enemy", instanceId: "missing" });

    expect(stub().getAttribute("data-mana")).toBe("10");
    expect(stub().getAttribute("data-hero-power-used")).toBe("false");
    expect(stub().getAttribute("data-enemy-minion-health")).toBe("10");
    expect(stub().getAttribute("data-target-mode")).toBe("none");
  });

  it("ignores the drop for classes whose hero power has no target", async () => {
    await openBoard("warrior");

    drop(heroPower, enemyMinion);
    expect(stub().getAttribute("data-mana")).toBe("10");
    expect(stub().getAttribute("data-hero-power-used")).toBe("false");
  });

  it("still uses the power when target mode was already on, and ends in no target mode", async () => {
    await openBoard("assassin");
    act(() => board.props!.onUseHeroPower!());
    await waitFor(() => expect(stub().getAttribute("data-target-mode")).toBe("hero-power"));

    drop(heroPower, enemyMinion);
    await waitFor(() => expect(stub().getAttribute("data-mana")).toBe("8"));
    expect(stub().getAttribute("data-enemy-minion-health")).toBe("8");
    expect(stub().getAttribute("data-target-mode")).toBe("none");
  });

  it("does nothing while the first-run tutorial is showing", async () => {
    window.localStorage.clear();
    await openBoard("assassin");
    await waitFor(() => expect(stub().getAttribute("data-tutorial-step")).not.toBe(""));

    drop(heroPower, enemyMinion);
    expect(stub().getAttribute("data-mana")).toBe("10");
    expect(stub().getAttribute("data-hero-power-used")).toBe("false");
    expect(stub().getAttribute("data-enemy-minion-health")).toBe("10");
  });
});
