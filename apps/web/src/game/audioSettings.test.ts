import { describe, expect, it, vi } from "vitest";
import { DEFAULT_AUDIO_SETTINGS, loadAudioSettings, saveAudioSettings } from "./audioSettings.js";

function memoryStorage(initial?: Record<string, string>) {
  const values = new Map(Object.entries(initial ?? {}));
  return {
    values,
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
  };
}

describe("audio settings storage", () => {
  it("uses the defined defaults when no saved value exists", () => {
    expect(loadAudioSettings(memoryStorage())).toEqual(DEFAULT_AUDIO_SETTINGS);
  });

  it("saves and reloads settings under the stable key", () => {
    const storage = memoryStorage();
    const settings = { musicVolume: 0.25, effectsVolume: 0.9, muted: true };
    saveAudioSettings(settings, storage);

    expect(storage.setItem).toHaveBeenCalledWith("board-game:audio-settings", JSON.stringify(settings));
    expect(loadAudioSettings(storage)).toEqual(settings);
  });

  it("clamps numeric volumes and defaults fields with invalid types independently", () => {
    const storage = memoryStorage({
      "board-game:audio-settings": JSON.stringify({ musicVolume: 3, effectsVolume: "loud", muted: "yes" }),
    });
    expect(loadAudioSettings(storage)).toEqual({ musicVolume: 1, effectsVolume: 0.7, muted: false });

    saveAudioSettings({ musicVolume: -2, effectsVolume: Number.NaN, muted: false }, storage);
    expect(JSON.parse(storage.values.get("board-game:audio-settings")!)).toEqual({
      musicVolume: 0,
      effectsVolume: 0.7,
      muted: false,
    });
  });

  it("falls back safely for malformed JSON and storage exceptions", () => {
    const malformed = memoryStorage({ "board-game:audio-settings": "{" });
    expect(loadAudioSettings(malformed)).toEqual(DEFAULT_AUDIO_SETTINGS);

    const throwingRead = { getItem: () => { throw new Error("storage unavailable"); } };
    const throwingWrite = { setItem: () => { throw new Error("quota exceeded"); } };
    expect(loadAudioSettings(throwingRead)).toEqual(DEFAULT_AUDIO_SETTINGS);
    expect(() => saveAudioSettings(DEFAULT_AUDIO_SETTINGS, throwingWrite)).not.toThrow();
  });
});
