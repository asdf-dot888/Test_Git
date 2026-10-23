// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CardView } from "./CardView.js";

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
});
