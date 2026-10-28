import type { AudioSettings } from "../game/audio.js";

export function AudioSettingsControls({ settings, onSettingsChange }: { settings: AudioSettings; onSettingsChange(settings: AudioSettings): void }) {
  return (
    <div className="audio-settings-controls">
      <label className="audio-settings-slider" htmlFor="music-volume">
        <span>배경 음악 <output htmlFor="music-volume">{Math.round(settings.musicVolume * 100)}%</output></span>
        <input id="music-volume" aria-label="배경 음악 음량" type="range" min="0" max="1" step="0.01" value={settings.musicVolume} onChange={(event) => onSettingsChange({ ...settings, musicVolume: Number(event.currentTarget.value) })} />
      </label>
      <label className="audio-settings-slider" htmlFor="effects-volume">
        <span>효과음 <output htmlFor="effects-volume">{Math.round(settings.effectsVolume * 100)}%</output></span>
        <input id="effects-volume" aria-label="효과음 음량" type="range" min="0" max="1" step="0.01" value={settings.effectsVolume} onChange={(event) => onSettingsChange({ ...settings, effectsVolume: Number(event.currentTarget.value) })} />
      </label>
      <label className="audio-settings-mute">
        <input type="checkbox" aria-label="전체 음소거" checked={settings.muted} onChange={(event) => onSettingsChange({ ...settings, muted: event.currentTarget.checked })} />
        <span>전체 음소거</span>
      </label>
    </div>
  );
}
