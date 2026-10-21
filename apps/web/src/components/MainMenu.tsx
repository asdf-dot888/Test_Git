interface MainMenuProps {
  canContinue: boolean;
  disabled?: boolean;
  onStart(): void;
  onContinue(): void;
}

export function MainMenu({ canContinue, disabled = false, onStart, onContinue }: MainMenuProps) {
  return (
    <main className="menu-screen">
      <div className="menu-card">
        <span className="menu-emblem" aria-hidden="true">✦</span>
        <span className="eyebrow">ASHEN EXPEDITION</span>
        <h1>잿빛 원정</h1>
        <p>세 페이즈의 전투에서 덱을 키우고, 어둠의 군주를 무찌르세요.</p>
        {canContinue && <button className="menu-primary" type="button" disabled={disabled} onClick={onContinue}>원정 계속하기</button>}
        <button className={canContinue ? "menu-secondary" : "menu-primary"} type="button" disabled={disabled} onClick={onStart}>새 원정 시작</button>
        <span className="menu-note">전투는 이 브라우저 세션에서 이어집니다.</span>
      </div>
    </main>
  );
}
