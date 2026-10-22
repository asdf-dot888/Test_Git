// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_AUDIO_SETTINGS } from "../game/audioSettings.js";
import { GameMenu } from "./GameMenu.js";

describe("GameMenu", () => {
  afterEach(() => cleanup());
  it("shows only settings, main menu, and return choices", () => {
    const handlers = { onSettingsChange: vi.fn(), onOpenSettings: vi.fn(), onBackToChoices: vi.fn(), onMainMenu: vi.fn(), onReturn: vi.fn() };
    render(<GameMenu view="choices" settings={DEFAULT_AUDIO_SETTINGS} {...handlers} />);

    expect(screen.getByRole("dialog", { name: "게임 메뉴" })).toBeTruthy();
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["설정", "메인 메뉴", "돌아가기"]);
    fireEvent.click(screen.getByRole("button", { name: "설정" }));
    fireEvent.click(screen.getByRole("button", { name: "메인 메뉴" }));
    fireEvent.click(screen.getByRole("button", { name: "돌아가기" }));
    expect(handlers.onOpenSettings).toHaveBeenCalledOnce();
    expect(handlers.onMainMenu).toHaveBeenCalledOnce();
    expect(handlers.onReturn).toHaveBeenCalledOnce();
  });

  it("exposes labeled audio controls and reports slider and mute changes", () => {
    const onSettingsChange = vi.fn();
    render(<GameMenu view="settings" settings={DEFAULT_AUDIO_SETTINGS} onSettingsChange={onSettingsChange} onOpenSettings={vi.fn()} onBackToChoices={vi.fn()} onMainMenu={vi.fn()} onReturn={vi.fn()} />);

    expect(screen.getByRole("slider", { name: "배경 음악 음량" })).toHaveProperty("value", "0.45");
    expect(screen.getByRole("slider", { name: "효과음 음량" })).toHaveProperty("value", "0.7");
    fireEvent.change(screen.getByRole("slider", { name: "배경 음악 음량" }), { target: { value: "0.25" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "전체 음소거" }));

    expect(onSettingsChange).toHaveBeenNthCalledWith(1, { ...DEFAULT_AUDIO_SETTINGS, musicVolume: 0.25 });
    expect(onSettingsChange).toHaveBeenNthCalledWith(2, { ...DEFAULT_AUDIO_SETTINGS, muted: true });
  });

  it("leaves Escape menu state changes to the active game session", () => {
    const onBackToChoices = vi.fn();
    const onReturn = vi.fn();
    const { rerender } = render(<GameMenu view="settings" settings={DEFAULT_AUDIO_SETTINGS} onSettingsChange={vi.fn()} onOpenSettings={vi.fn()} onBackToChoices={onBackToChoices} onMainMenu={vi.fn()} onReturn={onReturn} />);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    rerender(<GameMenu view="choices" settings={DEFAULT_AUDIO_SETTINGS} onSettingsChange={vi.fn()} onOpenSettings={vi.fn()} onBackToChoices={onBackToChoices} onMainMenu={vi.fn()} onReturn={onReturn} />);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(onBackToChoices).not.toHaveBeenCalled();
    expect(onReturn).not.toHaveBeenCalled();
  });
});
