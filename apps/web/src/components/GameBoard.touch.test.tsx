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

function dragSetup() {
  const run = createRun(930);
  const battle = run.battle!;
  battle.activeSide = "player";
  battle.status = "active";
  battle.turnNumber = 3;
  battle.playerMana = { current: 10, max: 10, temporary: 0 };
  battle.hand = [{ instanceId: "wolf-card", cardId: "ash-wolf" }, { instanceId: "bolt-card", cardId: "shadow-bolt" }, { instanceId: "lance-card", cardId: "soul-lance" }];
  battle.playerBoard = [{ instanceId: "ready", cardId: "ash-wolf", owner: "player", attack: 2, health: 3, maxHealth: 3, summonedTurn: 1, hasAttacked: false }];
  battle.enemyBoard = [{ instanceId: "enemy-wolf", cardId: "ash-wolf", owner: "enemy", attack: 3, health: 2, maxHealth: 5, summonedTurn: 0, hasAttacked: false }];
  return run;
}

function pointAt(selector: string | null) {
  document.elementFromPoint = vi.fn(() => (selector ? document.querySelector(selector) : null));
}

function finger(element: Element, type: "pointerDown" | "pointerMove" | "pointerUp", x: number, y: number) {
  fireEvent[type](element, { pointerType: "touch", pointerId: 7, clientX: x, clientY: y });
}

describe("GameBoard touch drag", () => {
  afterEach(() => {
    Reflect.deleteProperty(document, "elementFromPoint");
    document.body.classList.remove("touch-dragging");
  });

  it("plays a minion card dropped on an empty slot, outlining valid slots only while dragging", () => {
    const onDropInteraction = vi.fn();
    renderBoard(dragSetup(), { onDropInteraction });
    const card = document.querySelector(".hand-card-inspection .game-card[data-effect-instance-id='wolf-card']")!;
    pointAt(".lane-player .lane-slot[data-drop-target='slot:1']");

    finger(card, "pointerDown", 100, 500);
    finger(card, "pointerMove", 100, 300);
    const outlined = Array.from(document.querySelectorAll(".lane-player .lane-slot.is-drop-valid")).map((slot) => slot.getAttribute("data-drop-target"));
    expect(outlined).toEqual(["slot:1", "slot:2", "slot:3", "slot:4", "slot:5"]);
    expect(document.querySelector(".lane-player .lane-slot.is-drop-hover")?.getAttribute("data-drop-target")).toBe("slot:1");
    expect(document.querySelector(".touch-drag-ghost")).toBeTruthy();

    finger(card, "pointerUp", 100, 300);
    expect(onDropInteraction).toHaveBeenCalledExactlyOnceWith({ kind: "card", instanceId: "wolf-card" }, { kind: "slot", slotIndex: 1 });
    expect(document.querySelector(".is-drop-valid")).toBeNull();
    expect(document.querySelector(".touch-drag-ghost")).toBeNull();
  });

  it("casts a spell dropped on an enemy minion and on the enemy hero, and highlights them while dragging", () => {
    const onDropInteraction = vi.fn();
    renderBoard(dragSetup(), { onDropInteraction });
    const lance = document.querySelector(".game-card[data-effect-instance-id='lance-card']")!;
    pointAt(".lane-enemy .lane-slot[data-drop-target='minion:enemy:enemy-wolf']");
    finger(lance, "pointerDown", 100, 500);
    finger(lance, "pointerMove", 100, 300);
    expect(document.querySelector(".lane-enemy .lane-slot.is-drop-valid")).toBeTruthy();
    expect(document.querySelector(".hero-enemy.is-drop-valid")).toBeNull();
    finger(lance, "pointerUp", 100, 300);
    expect(onDropInteraction).toHaveBeenLastCalledWith({ kind: "card", instanceId: "lance-card" }, { kind: "minion", side: "enemy", instanceId: "enemy-wolf" });

    const bolt = document.querySelector(".game-card[data-effect-instance-id='bolt-card']")!;
    pointAt(".hero-enemy");
    finger(bolt, "pointerDown", 200, 500);
    finger(bolt, "pointerMove", 200, 300);
    expect(document.querySelector(".hero-enemy.is-drop-valid.is-drop-hover")).toBeTruthy();
    finger(bolt, "pointerUp", 200, 300);
    expect(onDropInteraction).toHaveBeenLastCalledWith({ kind: "card", instanceId: "bolt-card" }, { kind: "hero", side: "enemy" });
  });

  it("attacks with a ready minion dragged onto an enemy minion", () => {
    const onDropInteraction = vi.fn();
    renderBoard(dragSetup(), { onDropInteraction });
    const minion = document.querySelector(".lane-player .minion-card")!;
    pointAt(".lane-enemy .lane-slot[data-drop-target='minion:enemy:enemy-wolf']");

    finger(minion, "pointerDown", 300, 400);
    finger(minion, "pointerMove", 300, 380);
    expect(document.querySelector(".lane-enemy .lane-slot.is-drop-valid")).toBeTruthy();
    finger(minion, "pointerUp", 300, 380);
    expect(onDropInteraction).toHaveBeenCalledExactlyOnceWith({ kind: "minion", instanceId: "ready" }, { kind: "minion", side: "enemy", instanceId: "enemy-wolf" });
  });

  it("does nothing when released over an invalid place, and the card stays in the hand", () => {
    const onDropInteraction = vi.fn();
    renderBoard(dragSetup(), { onDropInteraction });
    const card = document.querySelector(".game-card[data-effect-instance-id='wolf-card']")!;
    pointAt(".lane-enemy .lane-slot[data-drop-target='minion:enemy:enemy-wolf']");

    finger(card, "pointerDown", 100, 500);
    finger(card, "pointerMove", 100, 300);
    finger(card, "pointerUp", 100, 300);
    expect(onDropInteraction).not.toHaveBeenCalled();
    expect(document.querySelector(".game-card[data-effect-instance-id='wolf-card']")).toBeTruthy();
  });

  it("scrolls the hand on a horizontal swipe instead of picking the card up", () => {
    const onDropInteraction = vi.fn();
    renderBoard(dragSetup(), { onDropInteraction });
    const card = document.querySelector(".game-card[data-effect-instance-id='wolf-card']")!;
    pointAt(".lane-player .lane-slot[data-drop-target='slot:1']");

    finger(card, "pointerDown", 100, 500);
    finger(card, "pointerMove", 160, 504);
    expect(document.querySelector(".touch-drag-ghost")).toBeNull();
    finger(card, "pointerUp", 160, 504);
    expect(onDropInteraction).not.toHaveBeenCalled();
  });

  it("does not open details or select a card from the click that follows a drag", () => {
    const props = renderBoard(dragSetup(), { onDropInteraction: vi.fn() });
    const card = document.querySelector(".game-card[data-effect-instance-id='wolf-card']")!;
    pointAt(".lane-enemy .lane-slot[data-drop-target='minion:enemy:enemy-wolf']");

    finger(card, "pointerDown", 100, 500);
    finger(card, "pointerMove", 100, 300);
    finger(card, "pointerUp", 100, 300);
    fireEvent.click(card);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(props.onSelectCard).not.toHaveBeenCalled();
  });

  it("does not drag cards the player cannot play", () => {
    const run = dragSetup();
    run.battle!.playerMana = { current: 0, max: 10, temporary: 0 };
    const onDropInteraction = vi.fn();
    renderBoard(run, { onDropInteraction });
    const card = document.querySelector(".game-card[data-effect-instance-id='wolf-card']")!;
    pointAt(".lane-player .lane-slot[data-drop-target='slot:1']");

    finger(card.parentElement!, "pointerDown", 100, 500);
    finger(card.parentElement!, "pointerMove", 100, 300);
    expect(document.querySelector(".touch-drag-ghost")).toBeNull();
    finger(card.parentElement!, "pointerUp", 100, 300);
    expect(onDropInteraction).not.toHaveBeenCalled();
  });
});
