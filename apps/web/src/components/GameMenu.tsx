import type { AudioSettings } from "../game/audio.js";
import { AudioSettingsControls } from "./AudioSettingsControls.js";

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
            <h2 id="game-menu-title">음향 설정</h2>
            <AudioSettingsControls settings={settings} onSettingsChange={onSettingsChange} />
            <div className="game-menu-actions">
              <button className="menu-secondary" type="button" onClick={onBackToChoices}>뒤로</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
