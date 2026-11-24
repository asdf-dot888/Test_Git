// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TurnBanner } from "./TurnBanner.js";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("TurnBanner", () => {
  it("shows a decorative, non-interactive banner for about one second", () => {
    vi.useFakeTimers();
    render(<TurnBanner turnKey="battle-1:2" side="player" />);
    const banner = document.body.querySelector<HTMLElement>(".turn-banner");
    expect(banner?.textContent).toBe("내 턴");
    expect(banner?.classList.contains("is-player")).toBe(true);
    expect(banner?.getAttribute("aria-hidden")).toBe("true");
    act(() => { vi.advanceTimersByTime(999); });
    expect(document.body.querySelector(".turn-banner")).toBeTruthy();
    act(() => { vi.advanceTimersByTime(1); });
    expect(document.body.querySelector(".turn-banner")).toBeNull();
  });

  it("names the enemy's turn and restarts for a new turn key", () => {
    vi.useFakeTimers();
    const { rerender } = render(<TurnBanner turnKey="enemy-battle-1:2" side="enemy" />);
    expect(document.body.querySelector(".turn-banner.is-enemy")?.textContent).toBe("상대 턴");
    act(() => { vi.advanceTimersByTime(1_000); });
    expect(document.body.querySelector(".turn-banner")).toBeNull();
    rerender(<TurnBanner turnKey="battle-1:3" side="player" />);
    expect(document.body.querySelector(".turn-banner.is-player")?.textContent).toBe("내 턴");
  });

  it("renders nothing without a turn key", () => {
    render(<TurnBanner turnKey={null} side="player" />);
    expect(document.body.querySelector(".turn-banner")).toBeNull();
  });
});
