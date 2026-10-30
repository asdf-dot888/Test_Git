import { useState } from "react";
import { GameGuideModal } from "./GameGuideModal.js";

interface MainMenuProps {
  canContinue: boolean;
  disabled?: boolean;
  showAutoplayHint?: boolean;
  onStart(): void;
  onContinue(): void;
  onLeaderboard(): void;
  onAudioSettings(): void;
  onReplayTutorial?(): void;
}

export function MainMenu({ canContinue, disabled = false, showAutoplayHint = false, onStart, onContinue, onLeaderboard, onAudioSettings, onReplayTutorial }: MainMenuProps) {
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <main className="menu-screen">
      <button className="menu-audio-settings-button" type="button" aria-label="음향 설정" title="음향 설정" disabled={disabled} onClick={onAudioSettings}><span aria-hidden="true">🔊</span></button>
      {showAutoplayHint && <span className="audio-autoplay-hint menu-audio-autoplay-hint" role="status">화면을 눌러 음악 시작</span>}
      <div className="menu-card">
        <span className="menu-emblem" aria-hidden="true">✦</span>
        <span className="eyebrow">MANGO STONE</span>
        <h1>망고스톤</h1>
        <p>세 페이즈의 전투에서 덱을 키우고, 어둠의 군주를 무찌르세요.</p>
        {canContinue && <button className="menu-primary" type="button" disabled={disabled} onClick={onContinue}>원정 계속하기</button>}
        <button className={canContinue ? "menu-secondary" : "menu-primary"} type="button" disabled={disabled} onClick={onStart}>새 원정 시작</button>
        <button className="menu-secondary" type="button" disabled={disabled} onClick={() => setGuideOpen(true)}>게임 방법</button>
        <button className="menu-secondary" type="button" disabled={disabled} onClick={onLeaderboard}>랭킹</button>
        <span className="menu-note">전투는 이 브라우저 세션에서 이어집니다.</span>
        <span className="menu-version">v{__APP_VERSION__}</span>
      </div>
      <GameGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} {...(onReplayTutorial ? { onReplayTutorial } : {})} />
    </main>
  );
}
