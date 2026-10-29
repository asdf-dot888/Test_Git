// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OpeningHandRedrawControl } from "./OpeningHandRedrawControl.js";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("OpeningHandRedrawControl", () => {
  it("exposes an accessible button and the redraw help text", () => {
    render(<OpeningHandRedrawControl disabled={false} onRedraw={vi.fn()} />);
    const button = screen.getByRole("button", { name: "시작 손패 다시 뽑기" });
    expect(button.getAttribute("aria-describedby")).toBe("opening-hand-redraw-tooltip");
    expect(screen.getByRole("tooltip").textContent).toBe("손패를 1회 다시 뽑습니다");
  });

  it("redraws on a brief touch press", () => {
    const onRedraw = vi.fn();
    render(<OpeningHandRedrawControl disabled={false} onRedraw={onRedraw} />);
    const button = screen.getByRole("button", { name: "시작 손패 다시 뽑기" });
    fireEvent.pointerDown(button, { pointerType: "touch", clientX: 10, clientY: 10 });
    fireEvent.pointerUp(button, { pointerType: "touch", clientX: 10, clientY: 10 });
    fireEvent.click(button);
    expect(onRedraw).toHaveBeenCalledOnce();
    expect(button.parentElement?.classList.contains("is-tooltip-visible")).toBe(false);
  });

  it("shows a tooltip after a long press, suppresses redraw, and dismisses two seconds after release", () => {
    vi.useFakeTimers();
    const onRedraw = vi.fn();
    render(<OpeningHandRedrawControl disabled={false} onRedraw={onRedraw} />);
    const button = screen.getByRole("button", { name: "시작 손패 다시 뽑기" });
    const wrapper = button.parentElement!;
    fireEvent.pointerDown(button, { pointerType: "touch", clientX: 10, clientY: 10 });
    act(() => vi.advanceTimersByTime(500));
    expect(wrapper.classList.contains("is-tooltip-visible")).toBe(true);
    fireEvent.pointerUp(button, { pointerType: "touch", clientX: 10, clientY: 10 });
    fireEvent.click(button);
    expect(onRedraw).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1999));
    expect(wrapper.classList.contains("is-tooltip-visible")).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(wrapper.classList.contains("is-tooltip-visible")).toBe(false);
  });

  it("cancels long press after movement and lets the next click redraw", () => {
    vi.useFakeTimers();
    const onRedraw = vi.fn();
    render(<OpeningHandRedrawControl disabled={false} onRedraw={onRedraw} />);
    const button = screen.getByRole("button", { name: "시작 손패 다시 뽑기" });
    fireEvent.pointerDown(button, { pointerType: "touch", clientX: 10, clientY: 10 });
    fireEvent.pointerMove(button, { pointerType: "touch", clientX: 21, clientY: 10 });
    act(() => vi.advanceTimersByTime(500));
    expect(button.parentElement?.classList.contains("is-tooltip-visible")).toBe(false);
    fireEvent.pointerUp(button, { pointerType: "touch", clientX: 21, clientY: 10 });
    fireEvent.click(button);
    expect(onRedraw).toHaveBeenCalledOnce();
  });

  it("clears pending timers on pointer cancel and unmount", () => {
    vi.useFakeTimers();
    const { unmount } = render(<OpeningHandRedrawControl disabled={false} onRedraw={vi.fn()} />);
    const button = screen.getByRole("button", { name: "시작 손패 다시 뽑기" });
    fireEvent.pointerDown(button, { pointerType: "touch", clientX: 10, clientY: 10 });
    expect(vi.getTimerCount()).toBe(1);
    fireEvent.pointerCancel(button);
    expect(vi.getTimerCount()).toBe(0);
    fireEvent.pointerDown(button, { pointerType: "touch", clientX: 10, clientY: 10 });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
