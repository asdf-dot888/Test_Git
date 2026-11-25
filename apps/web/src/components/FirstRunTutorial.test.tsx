// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TUTORIAL_STEPS } from "../game/tutorialSteps.js";
import { FirstRunTutorial } from "./FirstRunTutorial.js";

afterEach(cleanup);

describe("FirstRunTutorial", () => {
  it("has eight steps and shows the current one with its progress and an always-available skip", () => {
    expect(TUTORIAL_STEPS).toEqual(["turn-order", "mana", "hand", "play-card", "end-first-turn", "attack", "hero-power", "end-second-turn"]);
    const onSkip = vi.fn();
    render(<FirstRunTutorial step="attack" inputMode="pointer" onAction={vi.fn()} onSkip={onSkip} />);

    expect(screen.getByRole("dialog", { name: "하수인 공격" })).toBeTruthy();
    expect(screen.getByText("6 / 8")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it("offers continue only on the mana and hand steps", () => {
    const onAction = vi.fn();
    const { rerender } = render(<FirstRunTutorial step="mana" inputMode="pointer" onAction={onAction} onSkip={vi.fn()} />);
    expect(screen.getByText(/매 턴 1씩 늘어 최대 10/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "계속" }));
    expect(onAction).toHaveBeenCalledWith("continue");

    rerender(<FirstRunTutorial step="hand" inputMode="pointer" onAction={onAction} onSkip={vi.fn()} />);
    expect(screen.getByText(/왼쪽 위 숫자가 비용/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "계속" })).toBeTruthy();

    for (const step of ["turn-order", "play-card", "end-first-turn", "attack", "hero-power", "end-second-turn"] as const) {
      rerender(<FirstRunTutorial step={step} inputMode="pointer" onAction={onAction} onSkip={vi.fn()} />);
      expect(screen.queryByRole("button", { name: "계속" })).toBeNull();
    }
  });

  it("teaches the hero power cooldown and explains when the power cannot be used", () => {
    const onAction = vi.fn();
    const { rerender } = render(<FirstRunTutorial step="hero-power" playerClass="warrior" inputMode="pointer" onAction={onAction} onSkip={vi.fn()} />);
    expect(screen.getByText(/한 번 쓰면 내 턴 2번을 쉰 뒤/)).toBeTruthy();

    rerender(<FirstRunTutorial step="hero-power" playerClass="assassin" inputMode="touch" onAction={onAction} onSkip={vi.fn()} />);
    expect(screen.getByText(/적 하수인이나 적 영웅을 골라 씁니다\. 버튼을 적 위로 끌어 놓아도 됩니다/)).toBeTruthy();

    rerender(<FirstRunTutorial step="hero-power" playerClass="demonist" heroPowerUnavailable inputMode="pointer" onAction={onAction} onSkip={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "영웅 능력은 다음에" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "계속" }));
    expect(onAction).toHaveBeenCalledWith("continue");
  });

  it("keeps the mouse wording on pointer devices and drag wording on touch devices", () => {
    const { rerender } = render(<FirstRunTutorial step="play-card" inputMode="pointer" onAction={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText(/하수인 카드를 골라 내 전장에 내세요/)).toBeTruthy();
    rerender(<FirstRunTutorial step="play-card" inputMode="touch" onAction={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText(/위로 끌어 내 전장의 빈 칸에 놓으세요/)).toBeTruthy();
    rerender(<FirstRunTutorial step="attack" inputMode="touch" onAction={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText(/끌어 적 하수인이나 적 영웅 위에 놓으세요/)).toBeTruthy();
    rerender(<FirstRunTutorial step="turn-order" inputMode="touch" onAction={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText(/카드 한 장을 탭해/)).toBeTruthy();
    rerender(<FirstRunTutorial step="hand" inputMode="touch" onAction={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText(/카드를 탭하면 자세히 볼 수 있습니다/)).toBeTruthy();
  });

  it("follows the device when no input mode is given", () => {
    const original = Object.getOwnPropertyDescriptor(window, "matchMedia");
    Object.defineProperty(window, "matchMedia", { configurable: true, value: () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
    try {
      render(<FirstRunTutorial step="play-card" onAction={vi.fn()} onSkip={vi.fn()} />);
      expect(screen.getByText(/위로 끌어/)).toBeTruthy();
    } finally {
      if (original) Object.defineProperty(window, "matchMedia", original);
      else Reflect.deleteProperty(window, "matchMedia");
    }
  });

  it("explains the recovery path when the enemy removed every ready attacker", () => {
    render(<FirstRunTutorial step="attack" attackUnavailable onAction={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "공격할 하수인이 없어요" })).toBeTruthy();
    expect(screen.getByText(/공격할 하수인을 다시 준비/)).toBeTruthy();
  });
});
