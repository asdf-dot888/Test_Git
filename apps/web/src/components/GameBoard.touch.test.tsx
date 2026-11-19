// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRun } from "@board-game/game-core";
import { GameBoard, type GameBoardProps } from "./GameBoard.js";

afterEach(cleanup);

function boardWithMinions() {
  const run = createRun(930);
  const battle = run.battle!;
  battle.enemyBoard = [{ instanceId: "enemy-wolf", cardId: "ash-wolf", owner: "enemy", attack: 3, health: 2, maxHealth: 5, summonedTurn: 0, hasAttacked: false }];
  battle.playerBoard = [{ instanceId: "friendly-wolf", cardId: "ash-wolf", owner: "player", attack: 4, health: 3, maxHealth: 6, summonedTurn: 0, hasAttacked: false }];
  return run;
}

function renderBoard(run: ReturnType<typeof createRun>, overrides: Partial<GameBoardProps> = {}) {
  const props: GameBoardProps = {
    run,
    turnTimer: { text: "00:20", remainingSeconds: 20, visible: true },
    selectedCardInstanceId: null,
    selectedAttackerId: null,
    targetMode: "none",
    isResolving: false,
    error: null,
    onSelectCard: vi.fn(),
    onSelectTarget: vi.fn(),
    onDiscardCard: vi.fn(),
    onCancelTarget: vi.fn(),
    onEndTurn: vi.fn(),
    onMenu: vi.fn(),
    ...overrides,
  };
  render(<GameBoard {...props} />);
  return props;
}

function touchTap(element: Element) {
  fireEvent.pointerDown(element, { pointerType: "touch" });
  fireEvent.pointerUp(element, { pointerType: "touch" });
  fireEvent.click(element);
}

describe("GameBoard touch details for minions", () => {
  it("opens the details popup with live stats when a player minion is tapped, without selecting it", () => {
    const props = renderBoard(boardWithMinions());
    touchTap(document.querySelector(".lane-player .minion-card")!);

    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("현재 공격 4 · 체력 3/6");
    expect(props.onSelectTarget).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens details for an enemy minion even though its button is disabled outside target mode", () => {
    const props = renderBoard(boardWithMinions());
    const enemyMinion = document.querySelector<HTMLButtonElement>(".lane-enemy .minion-card")!;
    expect(enemyMinion.disabled).toBe(true);
    // On touch devices a disabled minion has pointer-events: none, so the tap lands on its inspection wrapper.
    touchTap(document.querySelector(".lane-enemy .minion-card-inspection")!);

    expect(screen.getByRole("dialog").textContent).toContain("현재 공격 3 · 체력 2/5");
    expect(props.onSelectTarget).not.toHaveBeenCalled();
  });

  it("still selects the attacker with a mouse click", () => {
    const props = renderBoard(boardWithMinions());
    const minion = document.querySelector(".lane-player .minion-card")!;
    fireEvent.pointerDown(minion, { pointerType: "mouse" });
    fireEvent.click(minion);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(props.onSelectTarget).toHaveBeenCalledWith("friendly-wolf");
  });

  it("lets a finger select a hero power target instead of opening details while that target mode is active", () => {
    const run = boardWithMinions();
    run.playerClass = "assassin";
    const props = renderBoard(run, { targetMode: "hero-power" });
    touchTap(document.querySelector(".lane-enemy .minion-card")!);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(props.onSelectTarget).toHaveBeenCalledWith("enemy-wolf");
  });
});
