// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HeroPowerControl } from "./HeroPowerControl.js";

afterEach(cleanup);

describe("HeroPowerControl", () => {
  it("shows a distinct decorative illustration for each class ability", () => {
    const onActivate = vi.fn();
    const props = { currentMana: 5, used: false, active: true, resolving: false, shardCount: 4, boardSize: 0, targetMode: false, onActivate };
    const { container, rerender } = render(<HeroPowerControl {...props} playerClass="warrior" />);

    for (const playerClass of ["warrior", "assassin", "demonist"] as const) {
      rerender(<HeroPowerControl {...props} playerClass={playerClass} />);
      const illustration = container.querySelector(".hero-power-illustration");
      expect(illustration?.getAttribute("src")).toBe(`/art/hero-powers/${playerClass}.png`);
      expect(illustration?.getAttribute("alt")).toBe("");
      expect(illustration?.getAttribute("aria-hidden")).toBe("true");
      expect(container.querySelector(".hero-power-glyph")).toBeNull();
    }
  });

  it("activates the ready Warrior power and exposes its mana cost and description", () => {
    const onActivate = vi.fn();
    const { container } = render(<HeroPowerControl playerClass="warrior" currentMana={2} used={false} active resolving={false} shardCount={0} boardSize={0} targetMode={false} onActivate={onActivate} />);

    const button = screen.getByRole("button", { name: /마나 2/ });
    expect(button.getAttribute("aria-describedby")).toBe("hero-power-details");
    fireEvent.click(button);

    expect(onActivate).toHaveBeenCalledOnce();
    expect(container.querySelector(".hero-power-cost-badge.is-mana")?.textContent).toContain("2");
    expect(screen.getByText(/방어도 2/)).toBeTruthy();
  });

  it("shows the Demonist's mana, soul-shard cost, and current shard count", () => {
    const onActivate = vi.fn();
    const { container } = render(<HeroPowerControl playerClass="demonist" currentMana={5} used={false} active resolving={false} shardCount={4} boardSize={1} targetMode={false} onActivate={onActivate} />);

    fireEvent.click(screen.getByRole("button", { name: /마나 2, 영혼 조각 3/ }));

    expect(onActivate).toHaveBeenCalledOnce();
    expect(container.querySelector(".hero-power-cost-badge.is-shard")?.textContent).toContain("3");
    expect(screen.getByText("보유 영혼 조각 4/6")).toBeTruthy();
  });

  it("keeps the Demonist power available at five minions and disables it at six", () => {
    const onActivate = vi.fn();
    const view = render(<HeroPowerControl playerClass="demonist" currentMana={5} used={false} active resolving={false} shardCount={4} boardSize={5} targetMode={false} onActivate={onActivate} />);
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(false);
    view.rerender(<HeroPowerControl playerClass="demonist" currentMana={5} used={false} active resolving={false} shardCount={4} boardSize={6} targetMode={false} onActivate={onActivate} />);
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
  });

  it("keeps the icon disabled when Demonist resources are insufficient and explains why", () => {
    render(<HeroPowerControl playerClass="demonist" currentMana={2} used={false} active resolving={false} shardCount={2} boardSize={0} targetMode={false} onActivate={vi.fn()} />);
    const button = screen.getByRole("button", { name: /영혼 조각 3/ });

    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.mouseEnter(button);
    expect(screen.getByText("영혼 조각 3 부족")).toBeTruthy();
  });
});
