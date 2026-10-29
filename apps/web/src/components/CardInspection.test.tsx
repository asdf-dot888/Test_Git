// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CARD_BY_ID } from "@board-game/game-core";
import { CardInspection } from "./CardInspection.js";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("CardInspection", () => {
  it("opens full details after a 500 ms touch hold and suppresses the resulting click", () => {
    vi.useFakeTimers();
    const onClick = vi.fn();
    render(<CardInspection card={CARD_BY_ID.get("shadow-bolt")!} className="test-inspection"><button type="button" onClick={onClick}>주문 카드</button></CardInspection>);
    const target = document.querySelector<HTMLElement>(".test-inspection")!;

    fireEvent.touchStart(target, { touches: [{ clientX: 20, clientY: 30 }] });
    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(499));
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole("dialog").textContent).toContain(CARD_BY_ID.get("shadow-bolt")!.description);

    fireEvent.touchEnd(target, { touches: [] });
    fireEvent.click(screen.getByRole("button", { name: "주문 카드" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("cancels a long press when the pointer moves and leaves short taps alone", () => {
    vi.useFakeTimers();
    const onClick = vi.fn();
    render(<CardInspection card={CARD_BY_ID.get("ash-wolf")!} className="test-inspection"><button type="button" onClick={onClick}>하수인 카드</button></CardInspection>);
    const target = document.querySelector<HTMLElement>(".test-inspection")!;

    fireEvent.touchStart(target, { touches: [{ clientX: 20, clientY: 30 }] });
    fireEvent.touchMove(target, { touches: [{ clientX: 31, clientY: 30 }] });
    act(() => vi.advanceTimersByTime(600));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.touchEnd(target, { touches: [] });
    fireEvent.click(screen.getByRole("button", { name: "하수인 카드" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("closes from the close button or backdrop but not from the dialog panel", () => {
    vi.useFakeTimers();
    render(<CardInspection card={CARD_BY_ID.get("ash-wolf")!} className="test-inspection"><button type="button">카드</button></CardInspection>);
    const target = document.querySelector<HTMLElement>(".test-inspection")!;
    fireEvent.touchStart(target, { touches: [{ clientX: 20, clientY: 30 }] });
    act(() => vi.advanceTimersByTime(500));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(dialog);
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.touchStart(target, { touches: [{ clientX: 20, clientY: 30 }] });
    act(() => vi.advanceTimersByTime(500));
    fireEvent.click(document.querySelector(".card-details-backdrop")!);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
