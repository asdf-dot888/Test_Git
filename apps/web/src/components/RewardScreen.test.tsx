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
});
