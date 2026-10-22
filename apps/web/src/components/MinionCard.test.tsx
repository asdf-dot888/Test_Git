// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MinionState } from "@board-game/game-core";
import { MinionCard } from "./MinionCard.js";

const minion: MinionState = {
  instanceId: "wolf-token-1",
  cardId: "ash-wolf",
  owner: "player",
  attack: 3,
  health: 2,
  maxHealth: 4,
  summonedTurn: 1,
  hasAttacked: false,
};

describe("MinionCard", () => {
  it("renders an illustrated framed token and retains selection and target states", () => {
    const onSelect = vi.fn();
    const { container } = render(<MinionCard minion={minion} selected={true} targetable={true} disabled={false} onSelect={onSelect} />);

    const button = screen.getByRole("button");
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/art/cards/ash-wolf.png");
    expect(button.classList.contains("is-selected") && button.classList.contains("is-targetable")).toBe(true);
    expect(button.getAttribute("aria-label")).toMatch(/아군 하수인 잿빛 늑대, 공격력 3, 체력 2\/4/);
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("keeps the same crisp card image while identifying the enemy faction", () => {
    const enemyMinion = { ...minion, instanceId: "enemy-wolf-token-1", owner: "enemy" as const };
    const { container } = render(
      <>
        <MinionCard minion={minion} selected={false} targetable={false} disabled={false} onSelect={vi.fn()} />
        <MinionCard minion={enemyMinion} selected={false} targetable={false} disabled={true} onSelect={vi.fn()} />
      </>,
    );
    const cards = container.querySelectorAll<HTMLButtonElement>(".minion-card");

    expect(cards[0]?.classList.contains("minion-friendly")).toBe(true);
    expect(cards[1]?.classList.contains("minion-enemy")).toBe(true);
    expect(cards[1]?.disabled).toBe(true);
    expect(cards[0]?.querySelector("img")?.getAttribute("src")).toBe("/art/cards/ash-wolf.png");
    expect(cards[1]?.querySelector("img")?.getAttribute("src")).toBe("/art/cards/ash-wolf.png");
    expect(cards[1]?.getAttribute("aria-label")).toContain("적 하수인 잿빛 늑대");
  });
});
