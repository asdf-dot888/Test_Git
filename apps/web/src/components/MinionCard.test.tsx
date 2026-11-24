// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MinionCard } from "./MinionCard.js";

describe("MinionCard", () => {
  it("exposes only the ability text as an accessible hover/focus tooltip", () => {
    render(<MinionCard minion={{ instanceId: "tooltip-minion", cardId: "mire-witch", owner: "player", attack: 2, health: 3, maxHealth: 3, summonedTurn: 0, hasAttacked: false }} selected={false} targetable={false} disabled={false} draggable onSelect={() => undefined} />);
    const card = screen.getByRole("button", { name: /아군 하수인 수렁 마녀/ });
    const tooltip = screen.getByRole("tooltip");
    expect(card.getAttribute("draggable")).toBe("true");
    expect(card.getAttribute("aria-describedby")).toBe(tooltip.id);
    expect(tooltip.textContent).toContain("전투의 함성");
    expect(tooltip.textContent).not.toContain("공격력");
  });

  it("marks an attack that is higher than the card's printed attack and leaves normal attack alone", () => {
    const base = { instanceId: "stat-minion", cardId: "mire-witch", owner: "enemy" as const, health: 4, maxHealth: 4, summonedTurn: 0, hasAttacked: false };
    const { rerender } = render(<MinionCard minion={{ ...base, attack: 4 }} selected={false} targetable={false} disabled={false} onSelect={() => undefined} />);
    const boosted = screen.getByLabelText("공격력 4");
    expect(boosted.className).toBe("is-boosted");
    expect(boosted.getAttribute("title")).toBe("기본 공격력 3 → 4");
    rerender(<MinionCard minion={{ ...base, attack: 3 }} selected={false} targetable={false} disabled={false} onSelect={() => undefined} />);
    expect(screen.getByLabelText("공격력 3").className).toBe("");
  });
});

