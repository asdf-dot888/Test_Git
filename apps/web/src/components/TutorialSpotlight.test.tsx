// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { findSpotlightTarget } from "../game/spotlightTarget.js";
import { TutorialSpotlight } from "./TutorialSpotlight.js";

function mockBox(element: HTMLElement, box: { top: number; left: number; width: number; height: number }) {
  element.getBoundingClientRect = () => ({ ...box, right: box.left + box.width, bottom: box.top + box.height, x: box.left, y: box.top, toJSON: () => box }) as DOMRect;
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("findSpotlightTarget", () => {
  it("returns the first matching element with a visible box, or null", () => {
    const hidden = document.createElement("button");
    hidden.className = "end-turn-button";
    mockBox(hidden, { top: 0, left: 0, width: 0, height: 0 });
    const visible = document.createElement("button");
    visible.className = "end-turn-button";
    mockBox(visible, { top: 10, left: 20, width: 80, height: 30 });
    document.body.append(hidden, visible);
    expect(findSpotlightTarget(".end-turn-button")).toBe(visible);
    expect(findSpotlightTarget(".missing")).toBeNull();
  });
});

describe("TutorialSpotlight", () => {
  it("cuts a hole around the target and shows the callout with skip and continue", () => {
    const target = document.createElement("section");
    target.className = "mana-display";
    mockBox(target, { top: 100, left: 200, width: 120, height: 40 });
    document.body.append(target);
    const onSkip = vi.fn();
    const onContinue = vi.fn();
    render(<TutorialSpotlight target=".mana-display" title="마나" description="매 턴 1씩 늘어납니다." stepLabel="2 / 8" onSkip={onSkip} onContinue={onContinue} />);

    const hole = screen.getByTestId("tutorial-spotlight-hole");
    expect(hole.style.top).toBe("92px");
    expect(hole.style.left).toBe("192px");
    expect(hole.style.width).toBe("136px");
    expect(hole.style.height).toBe("56px");
    expect(screen.getByRole("dialog", { name: "마나" })).toBeTruthy();
    expect(screen.getByText("2 / 8")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "계속" }));
    expect(onContinue).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it("has no continue button without onContinue and centres the callout without a target", () => {
    render(<TutorialSpotlight target={null} title="안내" description="설명" stepLabel="1 / 8" onSkip={vi.fn()} />);
    expect(screen.queryByTestId("tutorial-spotlight-hole")).toBeNull();
    expect(screen.queryByRole("button", { name: "계속" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "안내" })).toBeTruthy();
  });

  it("does not stand in the way of clicks on the game underneath", () => {
    const onClick = vi.fn();
    render(
      <>
        <button type="button" onClick={onClick}>보드 버튼</button>
        <TutorialSpotlight target={null} title="안내" description="설명" stepLabel="1 / 8" onSkip={vi.fn()} />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "보드 버튼" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("stops listening for layout changes when it is removed", () => {
    const removeListener = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<TutorialSpotlight target={null} title="안내" description="설명" stepLabel="1 / 8" onSkip={vi.fn()} />);
    unmount();
    expect(removeListener).toHaveBeenCalledWith("resize", expect.any(Function));
  });
});
