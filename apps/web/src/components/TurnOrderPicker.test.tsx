// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TurnOrderPicker } from "./TurnOrderPicker.js";

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("TurnOrderPicker", () => {
  it("shows two face-down cards, hides what is behind them and reports the picked index", () => {
    const onPick = vi.fn();
    render(<TurnOrderPicker battleId="b1" cards={["second", "first"]} pending pick={null} onPick={onPick} />);
    expect(screen.getByRole("dialog", { name: "선후공 정하기" })).toBeTruthy();
    expect(screen.queryByText("선공")).toBeNull();
    expect(screen.queryByText("후공")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "카드 2 선택" }));
    expect(onPick).toHaveBeenCalledWith(1);
  });

  it("flips the picked card for a moment after the pick and then goes away", () => {
    vi.useFakeTimers();
    const { container, rerender } = render(<TurnOrderPicker battleId="b1" cards={["second", "first"]} pending={false} pick={{ battleId: "b1", index: 0, role: "second" }} onPick={vi.fn()} />);
    expect(screen.getByRole("status", { name: "선후공 정하기" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "카드 1, 후공" }).hasAttribute("disabled")).toBe(true);
    expect(container.textContent).toContain("후공입니다");
    expect(container.textContent).toContain("동전");
    act(() => { vi.advanceTimersByTime(1400); });
    expect(container.querySelector(".turn-order-picker")).toBeNull();
    // A new battle brings the picker back.
    rerender(<TurnOrderPicker battleId="b2" cards={["first", "second"]} pending pick={{ battleId: "b1", index: 0, role: "second" }} onPick={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "선후공 정하기" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "카드 1 선택" }).hasAttribute("disabled")).toBe(false);
  });

  it("renders nothing once the battle is under way and no pick was made here", () => {
    const { container } = render(<TurnOrderPicker battleId="b3" cards={["first", "second"]} pending={false} pick={null} onPick={vi.fn()} />);
    expect(container.querySelector(".turn-order-picker")).toBeNull();
  });
});
