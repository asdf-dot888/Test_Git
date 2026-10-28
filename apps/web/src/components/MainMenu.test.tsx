// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MainMenu } from "./MainMenu.js";

describe("MainMenu", () => {
  afterEach(cleanup);
  it("opens the guide and routes leaderboard and audio settings actions", () => {
    const onStart = vi.fn();
    const onContinue = vi.fn();
    const onLeaderboard = vi.fn();
    const onAudioSettings = vi.fn();
    render(<MainMenu canContinue={false} onStart={onStart} onContinue={onContinue} onLeaderboard={onLeaderboard} onAudioSettings={onAudioSettings} />);

    const menuButtons = within(screen.getByRole("main").querySelector(".menu-card")!).getAllByRole("button");
    expect(screen.getByRole("heading", { name: "망고스톤" })).toBeTruthy();
    expect(screen.getByText("MANGO STONE")).toBeTruthy();
    expect(menuButtons.map((button) => button.textContent)).toEqual(["새 원정 시작", "게임 방법", "랭킹"]);
    fireEvent.click(screen.getByRole("button", { name: "음향 설정" }));
    expect(onAudioSettings).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "랭킹" }));
    expect(onLeaderboard).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "게임 방법" }));
    expect(screen.getByRole("dialog", { name: "게임 방법" })).toBeTruthy();
    expect(onStart).not.toHaveBeenCalled();
    expect(onContinue).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
  });

  it("keeps continue before new expedition and the guide immediately after it", () => {
    const { container } = render(<MainMenu canContinue onStart={vi.fn()} onContinue={vi.fn()} onLeaderboard={vi.fn()} onAudioSettings={vi.fn()} />);
    const menuButtons = within(container.querySelector(".menu-card")!).getAllByRole("button");
    expect(menuButtons.map((button) => button.textContent)).toEqual(["원정 계속하기", "새 원정 시작", "게임 방법", "랭킹"]);
  });

  it("disables the audio entry and menu controls while unavailable", () => {
    const { container } = render(<MainMenu canContinue disabled onStart={vi.fn()} onContinue={vi.fn()} onLeaderboard={vi.fn()} onAudioSettings={vi.fn()} />);
    for (const button of within(container.querySelector("main")!).getAllByRole("button")) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
    expect(container.querySelector(".menu-card")).not.toBeNull();
  });
});
