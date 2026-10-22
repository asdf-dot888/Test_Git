import type { AudioSettings } from "./audio.js";

const STORAGE_KEY = "board-game:audio-settings";

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  musicVolume: 0.45,
  effectsVolume: 0.7,
  muted: false,
};

type ReadStorage = Pick<Storage, "getItem">;
type WriteStorage = Pick<Storage, "setItem">;

function getBrowserStorage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

function boundedVolume(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

function normalizedSettings(value: unknown): AudioSettings {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return { ...DEFAULT_AUDIO_SETTINGS };
  const input = value as Record<string, unknown>;
  return {
    musicVolume: boundedVolume(input.musicVolume, DEFAULT_AUDIO_SETTINGS.musicVolume),
    effectsVolume: boundedVolume(input.effectsVolume, DEFAULT_AUDIO_SETTINGS.effectsVolume),
    muted: typeof input.muted === "boolean" ? input.muted : DEFAULT_AUDIO_SETTINGS.muted,
  };
}

export function loadAudioSettings(storage?: ReadStorage): AudioSettings {
  try {
    const source = storage ?? getBrowserStorage();
    const stored = source?.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_AUDIO_SETTINGS };
    return normalizedSettings(JSON.parse(stored) as unknown);
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

export function saveAudioSettings(settings: AudioSettings, storage?: WriteStorage): void {
  try {
    const destination = storage ?? getBrowserStorage();
    destination?.setItem(STORAGE_KEY, JSON.stringify(normalizedSettings(settings)));
  } catch {
    // Storage can be disabled or full; audio preferences remain usable in memory.
  }
}
