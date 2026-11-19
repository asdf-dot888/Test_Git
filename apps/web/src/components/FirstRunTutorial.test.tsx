// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FirstRunTutorial } from "./FirstRunTutorial.js";

afterEach(cleanup);

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

  it("keeps the mouse wording on pointer devices", () => {
    const { rerender } = render(<FirstRunTutorial step="play-card" inputMode="pointer" onAction={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText("마나가 충분한 카드 한 장을 손패에서 선택해 사용하세요.")).toBeTruthy();
    rerender(<FirstRunTutorial step="attack" inputMode="pointer" onAction={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText("공격 가능한 아군 하수인을 선택한 뒤 적 하수인 또는 적 영웅을 공격하세요.")).toBeTruthy();
  });

  it("explains tap-for-details and drag-to-act on touch devices instead of selecting", () => {
    const { rerender } = render(<FirstRunTutorial step="inspect-hand" inputMode="touch" onAction={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText(/카드를 탭하면 자세히 볼 수 있습니다/)).toBeTruthy();
    rerender(<FirstRunTutorial step="play-card" inputMode="touch" onAction={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText(/끌어 놓아 사용하세요/)).toBeTruthy();
    expect(screen.queryByText(/선택해 사용/)).toBeNull();
    rerender(<FirstRunTutorial step="attack" inputMode="touch" onAction={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText(/끌어 적 하수인 또는 적 영웅 위에 놓아 공격/)).toBeTruthy();
    expect(screen.queryByText(/선택한 뒤/)).toBeNull();
    rerender(<FirstRunTutorial step="end-first-turn" inputMode="touch" onAction={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText("턴 종료를 눌러 적의 행동을 확인하세요.")).toBeTruthy();
  });

  it("follows the device when no input mode is given", () => {
    const original = Object.getOwnPropertyDescriptor(window, "matchMedia");
    Object.defineProperty(window, "matchMedia", { configurable: true, value: () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
    try {
      render(<FirstRunTutorial step="play-card" onAction={vi.fn()} onSkip={vi.fn()} />);
      expect(screen.getByText(/끌어 놓아 사용하세요/)).toBeTruthy();
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
