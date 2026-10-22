import type { AudioSettings } from "../game/audio.js";

export interface GameMenuProps {
  view: "choices" | "settings";
  settings: AudioSettings;
  onSettingsChange(settings: AudioSettings): void;
  onOpenSettings(): void;
  onBackToChoices(): void;
  onMainMenu(): void;
  onReturn(): void;
}

export function GameMenu({ view, settings, onSettingsChange, onOpenSettings, onBackToChoices, onMainMenu, onReturn }: GameMenuProps) {
  return (
    <div className="game-menu-backdrop">
      <section className="game-menu-panel" role="dialog" aria-modal="true" aria-labelledby="game-menu-title">
        {view === "choices" ? (
          <>
            <span className="eyebrow">EXPEDITION PAUSED</span>
            <h2 id="game-menu-title">게임 메뉴</h2>
            <div className="game-menu-choices">
              <button className="menu-secondary" type="button" onClick={onOpenSettings}>설정</button>
              <button className="menu-secondary" type="button" onClick={onMainMenu}>메인 메뉴</button>
              <button className="menu-primary" type="button" onClick={onReturn}>돌아가기</button>
            </div>
          </>
        ) : (
          <>
            <span className="eyebrow">AUDIO</span>
            <h2 id="game-menu-title">오디오 설정</h2>
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
            <div className="game-menu-actions">
              <button className="menu-secondary" type="button" onClick={onBackToChoices}>뒤로</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
