// @vitest-environment jsdom
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { gameConstants } from "@board-game/game-core";
import { MinionLane } from "./MinionLane.js";

function transfer(value: string) {
  return { effectAllowed: "move", setData: vi.fn(), getData: (type: string) => type === "text/plain" ? value : "" } as unknown as DataTransfer;
}

const base = {
  selectedAttackerId: null,
  targetMode: "none" as const,
  targetSide: null,
  disabled: false,
  turnNumber: 2,
  onSelectTarget: vi.fn(),
};

describe("MinionLane drag and click", () => {
  it("renders six field slots", () => {
    const { container } = render(<MinionLane {...base} side="player" minions={[]} />);
    expect(container.querySelectorAll(".lane-slot")).toHaveLength(gameConstants.maxBoard);
  });

  it("marks newly summoned and already-attacked friendly minions as exhausted without disabling them", () => {
    const newlySummoned = { instanceId: "new-unit", cardId: "ash-wolf", owner: "player" as const, attack: 2, health: 1, maxHealth: 1, summonedTurn: 2, hasAttacked: false };
    const spent = { ...newlySummoned, instanceId: "spent-unit", summonedTurn: 0, hasAttacked: true };
    const { container } = render(<MinionLane {...base} side="player" minions={[newlySummoned, spent]} />);
    const [newCard, spentCard] = container.querySelectorAll<HTMLButtonElement>(".minion-card");
    if (!newCard || !spentCard) throw new Error("Expected two minions in the lane.");
    expect(newCard.classList.contains("is-exhausted")).toBe(true);
    expect(spentCard.classList.contains("is-exhausted")).toBe(true);
    expect((newCard as HTMLButtonElement).disabled).toBe(false);
  });

  it("keeps an exhausted friendly minion selectable as a friendly spell target", () => {
    const onSelectTarget = vi.fn();
    const exhausted = { instanceId: "spent-unit", cardId: "ash-wolf", owner: "player" as const, attack: 2, health: 1, maxHealth: 1, summonedTurn: 0, hasAttacked: true };
    const { container } = render(<MinionLane {...base} side="player" minions={[exhausted]} targetMode="spell" targetSide="player" onSelectTarget={onSelectTarget} />);
    const card = container.querySelector<HTMLButtonElement>(".minion-card");
    if (!card) throw new Error("Expected the exhausted minion card.");
    expect(card.classList.contains("is-exhausted")).toBe(true);
    fireEvent.click(card);
    expect(onSelectTarget).toHaveBeenCalledWith("spent-unit");
  });

  it("does not select an exhausted friendly minion for an attack", () => {
    const onSelectTarget = vi.fn();
    const exhausted = { instanceId: "spent-unit", cardId: "ash-wolf", owner: "player" as const, attack: 2, health: 1, maxHealth: 1, summonedTurn: 0, hasAttacked: true };
    const { container } = render(<MinionLane {...base} side="player" minions={[exhausted]} onSelectTarget={onSelectTarget} />);
    const card = container.querySelector<HTMLButtonElement>(".minion-card");
    if (!card) throw new Error("Expected the exhausted minion card.");
    fireEvent.click(card);
    expect(onSelectTarget).not.toHaveBeenCalled();
  });

  it("drops a hand minion on an empty friendly slot and preserves click selection", () => {
    const onDropTarget = vi.fn();
    const onSelectTarget = vi.fn();
    const { container } = render(<MinionLane {...base} side="player" minions={[
      { instanceId: "ready", cardId: "ash-wolf", owner: "player", attack: 2, health: 1, maxHealth: 1, summonedTurn: 0, hasAttacked: false },
    ]} onDropTarget={onDropTarget} onSelectTarget={onSelectTarget} />);
    const secondSlot = container.querySelectorAll(".lane-slot")[1]!;
    fireEvent.dragOver(secondSlot, { dataTransfer: transfer("card:hand-instance") });
    fireEvent.drop(secondSlot, { dataTransfer: transfer("card:hand-instance") });
    expect(onDropTarget).toHaveBeenCalledWith({ kind: "card", instanceId: "hand-instance" }, { kind: "slot", slotIndex: 1 });
    fireEvent.click(container.querySelector(".minion-card")!);
    expect(onSelectTarget).toHaveBeenCalledWith("ready");
  });

  it("drops friendly minions on enemy minions to dispatch a normal attack", () => {
    const onDropTarget = vi.fn();
    const enemy = { instanceId: "enemy-unit", cardId: "ash-wolf", owner: "enemy" as const, attack: 2, health: 2, maxHealth: 2, summonedTurn: 0, hasAttacked: false };
    const { container } = render(<MinionLane {...base} side="enemy" minions={[enemy]} onDropTarget={onDropTarget} />);
    fireEvent.drop(container.querySelector(".lane-slot")!, { dataTransfer: transfer("minion:attacker") });
    expect(onDropTarget).toHaveBeenCalledWith({ kind: "minion", instanceId: "attacker" }, { kind: "minion", side: "enemy", instanceId: "enemy-unit" });
  });

  it("routes a friendly minion dropped on a friendly minion to the fusion target", () => {
    const onDropTarget = vi.fn();
    const target = { instanceId: "target-unit", cardId: "ash-wolf", owner: "player" as const, attack: 2, health: 2, maxHealth: 2, summonedTurn: 0, hasAttacked: false };
    const { container } = render(<MinionLane {...base} side="player" minions={[target]} onDropTarget={onDropTarget} />);
    fireEvent.drop(container.querySelector(".lane-slot")!, { dataTransfer: transfer("minion:partner-unit") });
    expect(onDropTarget).toHaveBeenCalledWith({ kind: "minion", instanceId: "partner-unit" }, { kind: "minion", side: "player", instanceId: "target-unit" });
  });
});
