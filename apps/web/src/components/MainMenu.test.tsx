// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MainMenu } from "./MainMenu.js";

describe("MainMenu", () => {
  it("places the guide under new expedition and opens it without starting a run", () => {
    const onStart = vi.fn();
    const onContinue = vi.fn();
    render(<MainMenu canContinue={false} onStart={onStart} onContinue={onContinue} />);

    const menuButtons = within(screen.getByRole("main")).getAllByRole("button");
    expect(menuButtons.map((button) => button.textContent)).toEqual(["새 원정 시작", "게임 방법"]);

    fireEvent.click(screen.getByRole("button", { name: "게임 방법" }));
    expect(screen.getByRole("dialog", { name: "게임 방법" })).toBeTruthy();
    expect(onStart).not.toHaveBeenCalled();
    expect(onContinue).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("dialog", { name: "게임 방법" })).toBeNull();
  });

  it("keeps continue before new expedition and the guide immediately after it", () => {
    const { container } = render(<MainMenu canContinue={true} onStart={vi.fn()} onContinue={vi.fn()} />);
    const menuButtons = within(container.querySelector("main")!).getAllByRole("button");
    expect(menuButtons.map((button) => button.textContent)).toEqual(["원정 계속하기", "새 원정 시작", "게임 방법"]);
  });

  it("preserves disabled controls", () => {
    const { container } = render(<MainMenu canContinue={true} disabled={true} onStart={vi.fn()} onContinue={vi.fn()} />);
    for (const button of within(container.querySelector("main")!).getAllByRole("button")) {
      expect(button.hasAttribute("disabled")).toBe(true);
    }
  });
});
