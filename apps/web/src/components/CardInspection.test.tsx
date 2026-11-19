// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CARD_BY_ID } from "@board-game/game-core";
import { CardInspection } from "./CardInspection.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function tap(button: HTMLElement, pointerType: "touch" | "mouse" | "pen" = "touch"): void {
  fireEvent.pointerDown(button, { pointerType });
  fireEvent.pointerUp(button, { pointerType });
  fireEvent.click(button);
}

describe("CardInspection tap details", () => {
  it("opens full details on a touch tap and swallows the click so the card action does not run", () => {
    const onClick = vi.fn();
    render(<CardInspection card={CARD_BY_ID.get("shadow-bolt")!} className="test-inspection"><button type="button" onClick={onClick}>주문 카드</button></CardInspection>);

    tap(screen.getByRole("button", { name: "주문 카드" }));
    expect(screen.getByRole("dialog").textContent).toContain(CARD_BY_ID.get("shadow-bolt")!.description);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("lets mouse, pen and keyboard clicks through without opening details", () => {
    const onClick = vi.fn();
    render(<CardInspection card={CARD_BY_ID.get("ash-wolf")!} className="test-inspection"><button type="button" onClick={onClick}>하수인 카드</button></CardInspection>);
    const button = screen.getByRole("button", { name: "하수인 카드" });

    tap(button, "mouse");
    tap(button, "pen");
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not treat a later mouse click as a tap after an earlier touch tap", () => {
    const onClick = vi.fn();
    render(<CardInspection card={CARD_BY_ID.get("ash-wolf")!} className="test-inspection"><button type="button" onClick={onClick}>하수인 카드</button></CardInspection>);
    const button = screen.getByRole("button", { name: "하수인 카드" });

    tap(button, "touch");
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    tap(button, "mouse");
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens details for a tap that lands on the wrapper of a disabled child", () => {
    const onClick = vi.fn();
    const { container } = render(<CardInspection card={CARD_BY_ID.get("shadow-bolt")!} className="test-inspection"><button type="button" disabled onClick={onClick}>막힌 카드</button></CardInspection>);
    const wrapper = container.querySelector<HTMLElement>(".test-inspection")!;

    tap(wrapper);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("ignores taps when tapDetails is false", () => {
    const onClick = vi.fn();
    render(<CardInspection card={CARD_BY_ID.get("ash-wolf")!} className="test-inspection" tapDetails={false}><button type="button" onClick={onClick}>대상 카드</button></CardInspection>);

    tap(screen.getByRole("button", { name: "대상 카드" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not open details from a long press alone", () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<CardInspection card={CARD_BY_ID.get("ash-wolf")!} className="test-inspection"><button type="button">카드</button></CardInspection>);
      const target = container.querySelector<HTMLElement>(".test-inspection")!;
      fireEvent.pointerDown(target, { pointerType: "touch" });
      vi.advanceTimersByTime(1_000);
      expect(screen.queryByRole("dialog")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("closes from the close button or backdrop but not from the dialog panel, and does not reopen", () => {
    render(<CardInspection card={CARD_BY_ID.get("ash-wolf")!} className="test-inspection"><button type="button">카드</button></CardInspection>);
    const card = screen.getByRole("button", { name: "카드" });

    tap(card);
    fireEvent.click(screen.getByRole("dialog"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.pointerDown(screen.getByRole("button", { name: "닫기" }), { pointerType: "touch" });
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    tap(card);
    fireEvent.pointerDown(document.querySelector(".card-details-backdrop")!, { pointerType: "touch" });
    fireEvent.click(document.querySelector(".card-details-backdrop")!);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("runs the popup action once and closes the popup", () => {
    const onSelect = vi.fn();
    render(<CardInspection card={CARD_BY_ID.get("ash-wolf")!} className="test-inspection" action={{ label: "이 카드 받기", onSelect }}><button type="button">카드</button></CardInspection>);

    tap(screen.getByRole("button", { name: "카드" }));
    fireEvent.click(screen.getByRole("button", { name: "이 카드 받기" }));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("disables the popup action when asked", () => {
    const onSelect = vi.fn();
    render(<CardInspection card={CARD_BY_ID.get("ash-wolf")!} className="test-inspection" action={{ label: "이 카드 받기", disabled: true, onSelect }}><button type="button">카드</button></CardInspection>);

    tap(screen.getByRole("button", { name: "카드" }));
    const action = screen.getByRole("button", { name: "이 카드 받기" }) as HTMLButtonElement;
    expect(action.disabled).toBe(true);
    fireEvent.click(action);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("blocks the browser context menu only after a touch interaction", () => {
    const { container } = render(<CardInspection card={CARD_BY_ID.get("ash-wolf")!} className="test-inspection"><button type="button">카드</button></CardInspection>);
    const wrapper = container.querySelector<HTMLElement>(".test-inspection")!;
    const button = screen.getByRole("button", { name: "카드" });

    fireEvent.pointerDown(button, { pointerType: "mouse" });
    expect(fireEvent.contextMenu(button)).toBe(true);
    fireEvent.pointerDown(button, { pointerType: "touch" });
    expect(fireEvent.contextMenu(wrapper)).toBe(false);
  });
});
