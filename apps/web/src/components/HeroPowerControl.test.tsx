// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { gameConstants } from "@board-game/game-core";
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
    expect(screen.getByText(/방어도 4/)).toBeTruthy();
  });

  it("shows the Demonist's mana, soul-shard cost, and current shard count", () => {
    const onActivate = vi.fn();
    const { container } = render(<HeroPowerControl playerClass="demonist" currentMana={5} used={false} active resolving={false} shardCount={4} boardSize={1} targetMode={false} onActivate={onActivate} />);

    fireEvent.click(screen.getByRole("button", { name: new RegExp(`마나 2, 영혼 조각 ${gameConstants.soulShardHeroPowerCost}`) }));

    expect(onActivate).toHaveBeenCalledOnce();
    expect(container.querySelector(".hero-power-cost-badge.is-shard")?.textContent).toContain(String(gameConstants.soulShardHeroPowerCost));
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
    render(<HeroPowerControl playerClass="demonist" currentMana={2} used={false} active resolving={false} shardCount={gameConstants.soulShardHeroPowerCost - 1} boardSize={0} targetMode={false} onActivate={vi.fn()} />);
    const button = screen.getByRole("button", { name: new RegExp(`영혼 조각 ${gameConstants.soulShardHeroPowerCost}`) });

    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.mouseEnter(button);
    expect(screen.getByText(`영혼 조각 ${gameConstants.soulShardHeroPowerCost} 부족`)).toBeTruthy();
  });
});

describe("HeroPowerControl touch drag", () => {
  const finger = (element: Element, type: "pointerDown" | "pointerMove" | "pointerUp", x: number, y: number, pointerType = "touch") => {
    fireEvent[type](element, { pointerType, pointerId: 5, clientX: x, clientY: y });
  };
  const enemyTarget = { kind: "minion", side: "enemy", instanceId: "enemy-a" } as const;
  const payload = { kind: "hero-power", instanceId: "hero-power" } as const;

  function renderAssassin({ withoutDrop = false, ...overrides }: Partial<Parameters<typeof HeroPowerControl>[0]> & { withoutDrop?: boolean } = {}) {
    const onActivate = vi.fn();
    const onDrop = vi.fn();
    const getValidTargets = vi.fn(() => [enemyTarget]);
    const onDragStateChange = vi.fn();
    render(<HeroPowerControl playerClass="assassin" currentMana={5} used={false} active resolving={false} shardCount={0} boardSize={0} targetMode={false} onActivate={onActivate} getValidTargets={getValidTargets} onDragStateChange={onDragStateChange} {...(withoutDrop ? {} : { onDrop })} {...overrides} />);
    return { onActivate, onDrop, getValidTargets, onDragStateChange, button: screen.getByRole("button") };
  }

  afterEach(() => {
    Reflect.deleteProperty(document, "elementFromPoint");
    document.body.classList.remove("touch-dragging");
  });

  it("drops the hero power payload on the target under the finger and reports the drag state", () => {
    const { button, onDrop, getValidTargets, onDragStateChange, onActivate } = renderAssassin();
    const targetElement = document.createElement("div");
    targetElement.setAttribute("data-drop-target", "minion:enemy:enemy-a");
    document.body.append(targetElement);
    document.elementFromPoint = vi.fn(() => targetElement);

    finger(button, "pointerDown", 10, 400);
    finger(button, "pointerMove", 10, 200);
    expect(getValidTargets).toHaveBeenCalledWith(payload);
    expect(document.querySelector(".touch-drag-ghost .hero-power-ghost img")?.getAttribute("src")).toBe("/art/hero-powers/assassin.png");
    expect(onDragStateChange).toHaveBeenLastCalledWith(expect.objectContaining({ payload, hovered: enemyTarget, valid: [enemyTarget] }));

    finger(button, "pointerUp", 10, 200);
    expect(onDrop).toHaveBeenCalledExactlyOnceWith(payload, enemyTarget);
    expect(onDragStateChange).toHaveBeenLastCalledWith(null);
    fireEvent.click(button);
    expect(onActivate).not.toHaveBeenCalled();
    targetElement.remove();
  });

  it("treats a press that barely moves as a tap", () => {
    const { button, onActivate, onDrop } = renderAssassin();
    finger(button, "pointerDown", 10, 400);
    finger(button, "pointerMove", 12, 402);
    finger(button, "pointerUp", 12, 402);
    fireEvent.click(button);
    expect(onActivate).toHaveBeenCalledOnce();
    expect(onDrop).not.toHaveBeenCalled();
    expect(document.querySelector(".touch-drag-ghost")).toBeNull();
  });

  it.each([
    ["warrior", { playerClass: "warrior" as const }],
    ["demonist", { playerClass: "demonist" as const, shardCount: 4 }],
    ["used", { used: true }],
    ["low mana", { currentMana: 1 }],
    ["inactive", { active: false }],
    ["resolving", { resolving: true }],
    ["target mode", { targetMode: true }],
    ["no drop handler", { withoutDrop: true }],
  ])("does not start a drag (%s)", (_name, overrides) => {
    const { button } = renderAssassin(overrides);
    finger(button, "pointerDown", 10, 400);
    finger(button, "pointerMove", 10, 200);
    expect(document.querySelector(".touch-drag-ghost")).toBeNull();
  });

  it("does not start a drag with a mouse", () => {
    const { button, onDrop } = renderAssassin();
    finger(button, "pointerDown", 10, 400, "mouse");
    finger(button, "pointerMove", 10, 200, "mouse");
    finger(button, "pointerUp", 10, 200, "mouse");
    expect(document.querySelector(".touch-drag-ghost")).toBeNull();
    expect(onDrop).not.toHaveBeenCalled();
  });
});
