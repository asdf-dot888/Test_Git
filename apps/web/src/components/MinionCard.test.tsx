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

  it("marks a taunt minion with a shield frame, a badge and a spoken label, and dims a blocked one", () => {
    const base = { instanceId: "taunt-minion", owner: "enemy" as const, attack: 1, health: 4, maxHealth: 4, summonedTurn: 0, hasAttacked: false };
    const { container, rerender } = render(<MinionCard minion={{ ...base, cardId: "warrior-vanguard" }} selected={false} targetable={false} disabled={false} onSelect={() => undefined} />);
    const taunt = screen.getByRole("button", { name: /적 하수인 전위병.*, 도발/ });
    expect(taunt.className).toContain("is-taunt");
    expect(container.querySelector(".minion-taunt-badge")).not.toBeNull();
    rerender(<MinionCard minion={{ ...base, cardId: "ash-wolf" }} selected={false} targetable={false} disabled={false} blocked onSelect={() => undefined} />);
    const plain = screen.getByRole("button", { name: /적 하수인 잿빛 늑대/ });
    expect(plain.className).toContain("is-blocked-target");
    expect(plain.className).not.toContain("is-taunt");
    expect(plain.getAttribute("aria-label")).not.toContain("도발");
    expect(container.querySelector(".minion-taunt-badge")).toBeNull();
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

