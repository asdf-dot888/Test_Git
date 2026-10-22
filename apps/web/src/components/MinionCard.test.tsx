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
    expect(button.getAttribute("aria-label")).toMatch(/잿빛 늑대, 공격력 3, 체력 2\/4/);
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledOnce();
  });
});
