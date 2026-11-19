// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RewardScreen } from "./RewardScreen.js";

afterEach(cleanup);

describe("RewardScreen", () => {
  it("renders illustrated reward cards and returns the chosen card id", () => {
    const onChoose = vi.fn();
    render(<RewardScreen reward={{ tier: "normal", choices: ["ash-wolf", "shadow-bolt"], encounterIndex: 0 }} onChoose={onChoose} onSkip={vi.fn()} />);

    const rewards = screen.getAllByRole("button").filter((button) => button.classList.contains("reward-card"));
    expect(rewards[0]!.querySelector("img")?.getAttribute("src")).toBe("/art/cards/ash-wolf.png");
    expect(rewards[0]!.textContent).toContain("공격");
    expect(rewards[1]!.textContent).toContain("주문");
    fireEvent.click(rewards[0]!);
    expect(onChoose).toHaveBeenCalledWith("ash-wolf");
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
  });

  it("closes the reward flow through its X control", () => {
    const onSkip = vi.fn();
    render(<RewardScreen reward={{ tier: "normal", choices: ["ash-wolf"], encounterIndex: 0 }} onChoose={vi.fn()} onSkip={onSkip} />);
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it("inspects a reward card on a touch tap without choosing it", () => {
    const onChoose = vi.fn();
    render(<RewardScreen reward={{ tier: "normal", choices: ["shadow-bolt"], encounterIndex: 0 }} onChoose={onChoose} onSkip={vi.fn()} />);
    const card = screen.getByRole("button", { name: /주문/ });
    fireEvent.pointerDown(card, { pointerType: "touch" });
    fireEvent.pointerUp(card, { pointerType: "touch" });
    fireEvent.click(card);
    expect(screen.getByRole("dialog").textContent).toContain("주문");
    expect(onChoose).not.toHaveBeenCalled();
  });

  it("chooses the reward only from the popup button on touch, and closing the popup chooses nothing", () => {
    const onChoose = vi.fn();
    render(<RewardScreen reward={{ tier: "normal", choices: ["ash-wolf", "shadow-bolt"], encounterIndex: 0 }} onChoose={onChoose} onSkip={vi.fn()} />);
    const card = screen.getAllByRole("button").find((button) => button.classList.contains("reward-card") && button.textContent?.includes("주문"))!;

    fireEvent.pointerDown(card, { pointerType: "touch" });
    fireEvent.click(card);
    fireEvent.click(screen.getAllByRole("button", { name: "닫기" }).at(-1)!);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onChoose).not.toHaveBeenCalled();

    fireEvent.pointerDown(card, { pointerType: "touch" });
    fireEvent.click(card);
    fireEvent.click(screen.getByRole("button", { name: "이 카드 받기" }));
    expect(onChoose).toHaveBeenCalledOnce();
    expect(onChoose).toHaveBeenCalledWith("shadow-bolt");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("disables the popup button while the reward is saving or already chosen", () => {
    const open = () => {
      const card = screen.getAllByRole("button").find((button) => button.classList.contains("reward-card"))!;
      // A disabled card button has pointer-events: none, so the tap lands on its wrapper.
      fireEvent.pointerDown(card.parentElement!, { pointerType: "touch" });
      fireEvent.click(card.parentElement!);
    };

    render(<RewardScreen reward={{ tier: "normal", choices: ["shadow-bolt"], encounterIndex: 0 }} disabled onChoose={vi.fn()} onSkip={vi.fn()} />);
    open();
    expect((screen.getByRole("button", { name: "이 카드 받기" }) as HTMLButtonElement).disabled).toBe(true);
    cleanup();

    render(<RewardScreen reward={{ tier: "normal", choices: ["shadow-bolt"], encounterIndex: 0 }} selectedCardId="shadow-bolt" onChoose={vi.fn()} onSkip={vi.fn()} />);
    open();
    expect((screen.getByRole("button", { name: "이 카드 받기" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
