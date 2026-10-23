// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TurnStartGlow } from "./TurnStartGlow.js";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("TurnStartGlow", () => {
  it("shows a decorative, non-interactive edge glow for about one second", () => {
    vi.useFakeTimers();
    const { rerender } = render(<TurnStartGlow turnId="battle-1:2" />);
    const glow = document.body.querySelector<HTMLElement>(".turn-start-glow");

    expect(glow?.dataset.turnId).toBe("battle-1:2");
    expect(glow?.getAttribute("aria-hidden")).toBe("true");
    expect(glow?.style.pointerEvents).not.toBe("auto");

    act(() => { vi.advanceTimersByTime(999); });
    expect(document.body.querySelector(".turn-start-glow")).toBeTruthy();
    act(() => { vi.advanceTimersByTime(1); });
    expect(document.body.querySelector(".turn-start-glow")).toBeNull();

    rerender(<TurnStartGlow turnId={null} />);
    expect(document.body.querySelector(".turn-start-glow")).toBeNull();
  });
});
