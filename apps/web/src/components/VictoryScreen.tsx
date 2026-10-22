export interface VictoryScreenProps {
  disabled?: boolean;
  onConfirm(): void;
}

export function VictoryScreen({ disabled = false, onConfirm }: VictoryScreenProps) {
  return (
    <main className="run-screen victory-screen">
      <section className="run-card victory-card" role="dialog" aria-modal="true" aria-labelledby="victory-title">
        <span className="victory-light" aria-hidden="true" />
        <span className="eyebrow">BATTLE CLEARED</span>
        <h1 id="victory-title">승리</h1>
        <p>전투에서 승리했습니다. 보상을 확인하고 다음 전투를 준비하세요.</p>
        <button className="menu-primary" type="button" disabled={disabled} onClick={onConfirm}>확인</button>
      </section>
    </main>
  );
}
