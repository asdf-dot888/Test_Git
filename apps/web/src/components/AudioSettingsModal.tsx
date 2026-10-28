import type { AudioSettings } from "../game/audio.js";
import { AudioSettingsControls } from "./AudioSettingsControls.js";

export function AudioSettingsModal({ settings, onSettingsChange, onClose }: { settings: AudioSettings; onSettingsChange(settings: AudioSettings): void; onClose(): void }) {
  return (
    <div className="game-menu-backdrop audio-settings-backdrop">
      <section className="game-menu-panel audio-settings-modal" role="dialog" aria-modal="true" aria-labelledby="audio-settings-title">
        <button className="dialog-close" type="button" aria-label="닫기" onClick={onClose}>×</button>
        <span className="eyebrow">AUDIO</span>
        <h2 id="audio-settings-title">음향 설정</h2>
        <AudioSettingsControls settings={settings} onSettingsChange={onSettingsChange} />
      </section>
    </div>
  );
}
