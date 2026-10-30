// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FirstRunTutorial } from "./FirstRunTutorial.js";

describe("FirstRunTutorial", () => {
  it("shows the current instruction, progress, and an always-available skip", () => {
    const onSkip = vi.fn();
    render(<FirstRunTutorial step="attack" onAction={vi.fn()} onSkip={onSkip} />);

    expect(screen.getByRole("dialog", { name: "하수인 공격" })).toBeTruthy();
    expect(screen.getByText("전투 안내 · 4 / 5")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it("lets the player continue after inspecting mana and hand", () => {
    const onAction = vi.fn();
    render(<FirstRunTutorial step="inspect-hand" onAction={onAction} onSkip={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "계속" }));
    expect(onAction).toHaveBeenCalledWith("continue");
  });

  it("explains the recovery path when the enemy removed every ready attacker", () => {
    render(<FirstRunTutorial step="attack" attackUnavailable onAction={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "공격할 하수인이 없어요" })).toBeTruthy();
    expect(screen.getByText(/공격할 하수인을 다시 준비/)).toBeTruthy();
  });
});
