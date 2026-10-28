// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_AUDIO_SETTINGS } from "../game/audioSettings.js";
import { AudioSettingsModal } from "./AudioSettingsModal.js";

describe("AudioSettingsModal", () => {
  it("provides accessible shared controls and closes on request", () => {
    const onSettingsChange = vi.fn();
    const onClose = vi.fn();
    render(<AudioSettingsModal settings={DEFAULT_AUDIO_SETTINGS} onSettingsChange={onSettingsChange} onClose={onClose} />);

    const dialog = screen.getByRole("dialog", { name: "음향 설정" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    fireEvent.change(screen.getByRole("slider", { name: "배경 음악 음량" }), { target: { value: "0.2" } });
    expect(onSettingsChange).toHaveBeenCalledWith({ ...DEFAULT_AUDIO_SETTINGS, musicVolume: 0.2 });
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
