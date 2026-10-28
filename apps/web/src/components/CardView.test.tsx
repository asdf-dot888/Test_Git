// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CARD_BY_ID } from "@board-game/game-core";
import { CardView } from "./CardView.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("CardView", () => {
  it("renders large-art minion and spell cards while preserving card interactions", () => {
    const onSelect = vi.fn();
    const { container, rerender } = render(<CardView instance={{ instanceId: "wolf-1", cardId: "ash-wolf" }} effectSlot={2} selected={true} disabled={false} onSelect={onSelect} />);

    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.getAttribute("data-effect-anchor")).toBe("hand:player:2");
    expect(button.getAttribute("data-effect-instance-id")).toBe("wolf-1");
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/art/cards/ash-wolf.png");
    expect(container.textContent).toContain("잿빛 늑대");
    expect(container.textContent).toContain("공격");

    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(document.querySelector(".game-card-hover-preview")).toBeNull();

    rerender(<CardView instance={{ instanceId: "bolt-1", cardId: "shadow-bolt" }} selected={false} disabled={true} onSelect={onSelect} />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/art/cards/shadow-bolt.png");
    expect(screen.getByRole("button").hasAttribute("disabled")).toBe(true);
  });

  it("renders the player-only mana spell and its illustration", () => {
    const { container } = render(<CardView instance={{ instanceId: "mana-spring-1", cardId: "mana-spring" }} selected={false} disabled={false} onSelect={vi.fn()} />);
    expect(container.querySelector(".card-cost")?.textContent).toBe("0");
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/art/cards/mana-spring.png");
    expect(container.textContent).toContain("마력의 샘");
    expect(container.textContent).toContain("마나 1을 얻습니다.");
  });

  it("shows a viewport-bounded 1.5x full minion card only while hovered", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 768 });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 40, y: 400, top: 400, left: 40, right: 136, bottom: 556, width: 96, height: 156, toJSON: () => ({}),
    } as DOMRect);
    const definition = CARD_BY_ID.get("ash-wolf")!;
    render(<CardView instance={{ instanceId: "wolf-hover", cardId: "ash-wolf" }} selected={false} disabled={false} onSelect={vi.fn()} />);
    const button = screen.getByRole("button");

    fireEvent.mouseEnter(button);

    const preview = document.querySelector<HTMLElement>(".game-card-hover-preview");
    expect(preview).not.toBeNull();
    expect(preview?.getAttribute("aria-hidden")).toBe("true");
    expect(preview?.getAttribute("role")).toBeNull();
    expect(preview?.style.left).toBe("16px");
    expect(preview?.style.top).toBe("156px");
    expect(preview?.style.width).toBe("144px");
    expect(preview?.style.height).toBe("234px");
    expect(preview?.querySelector("img")?.getAttribute("src")).toBe(`/art/cards/${definition.artKey}.png`);
    expect(preview?.textContent).toContain(definition.name);
    expect(preview?.textContent).toContain(definition.description);
    expect(preview?.textContent).toContain(`공격 ${definition.minion!.attack} · 체력 ${definition.minion!.maxHealth}`);
    expect(preview?.querySelector("button")).toBeNull();

    fireEvent.mouseLeave(button);
    expect(document.querySelector(".game-card-hover-preview")).toBeNull();
  });

  it("shows a spell's full description in the hover preview without minion stats", () => {
    render(<CardView instance={{ instanceId: "bolt-hover", cardId: "shadow-bolt" }} selected={false} disabled={false} onSelect={vi.fn()} />);
    fireEvent.mouseEnter(screen.getByRole("button"));

    const preview = document.querySelector(".game-card-hover-preview");
    const definition = CARD_BY_ID.get("shadow-bolt")!;
    expect(preview?.querySelector(".card-kind")?.textContent).toBe("주문");
    expect(preview?.querySelector(".card-description")?.textContent).toBe(definition.description);
    expect(preview?.querySelector(".card-stats")).toBeNull();
  });
});
