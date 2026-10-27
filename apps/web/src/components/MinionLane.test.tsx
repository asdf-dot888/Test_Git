// @vitest-environment jsdom
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
  it("drops a hand minion on an empty friendly slot and preserves click selection", () => {
    const onDropTarget = vi.fn();
    const onSelectTarget = vi.fn();
    const { container, getByRole } = render(<MinionLane {...base} side="player" minions={[
      { instanceId: "ready", cardId: "ash-wolf", owner: "player", attack: 2, health: 1, maxHealth: 1, summonedTurn: 0, hasAttacked: false },
    ]} onDropTarget={onDropTarget} onSelectTarget={onSelectTarget} />);
    const secondSlot = container.querySelectorAll(".lane-slot")[1]!;
    fireEvent.dragOver(secondSlot, { dataTransfer: transfer("card:hand-instance") });
    fireEvent.drop(secondSlot, { dataTransfer: transfer("card:hand-instance") });
    expect(onDropTarget).toHaveBeenCalledWith({ kind: "card", instanceId: "hand-instance" }, { kind: "slot", slotIndex: 1 });
    fireEvent.click(getByRole("button", { name: /아군 하수인 잿빛 늑대/ }));
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
