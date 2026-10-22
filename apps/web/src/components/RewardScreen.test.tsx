// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RewardScreen } from "./RewardScreen.js";

describe("RewardScreen", () => {
  it("renders illustrated reward cards and returns the chosen card id", () => {
    const onChoose = vi.fn();
    render(<RewardScreen reward={{ tier: "normal", choices: ["ash-wolf", "shadow-bolt"], encounterIndex: 0 }} onChoose={onChoose} onSkip={vi.fn()} />);

    const rewards = screen.getAllByRole("button").slice(0, 2);
    expect(rewards[0]!.querySelector("img")?.getAttribute("src")).toBe("/art/cards/ash-wolf.png");
    expect(rewards[0]!.textContent).toContain("공격");
    expect(rewards[1]!.textContent).toContain("주문");
    fireEvent.click(rewards[0]!);
    expect(onChoose).toHaveBeenCalledWith("ash-wolf");
  });
});
