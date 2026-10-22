import { ENEMY_BY_ID, type EncounterState } from "@board-game/game-core";

interface EncounterContinueScreenProps {
  phase: 1 | 2 | 3;
  completedBattles: number;
  nextEncounter: EncounterState | null;
  disabled?: boolean;
  onContinue(): void;
  onReturnToMenu(): void;
}

export function EncounterContinueScreen({ phase, completedBattles, nextEncounter, disabled = false, onContinue, onReturnToMenu }: EncounterContinueScreenProps) {
  const enemy = nextEncounter ? ENEMY_BY_ID.get(nextEncounter.enemyId) : undefined;
  const encounterLabel = nextEncounter?.kind === "boss" ? "보스전" : "일반 전투";

  return (
    <main className="run-screen">
      <section className="run-card outcome-card encounter-continue-card" role="dialog" aria-modal="true" aria-labelledby="encounter-continue-title">
        <span className="eyebrow">BATTLE CLEARED</span>
        <h1 id="encounter-continue-title">다음 전투에 진입할까요?</h1>
        {nextEncounter ? (
          <p>다음 전투는 <strong>{enemy?.name ?? "미지의 적"}</strong>과의 {encounterLabel}입니다.</p>
        ) : (
          <p>다음 전투 정보를 불러오지 못했습니다. 메인 메뉴에서 진행 상태를 확인하세요.</p>
        )}
        <div className="outcome-stats">
          <span>다음 Phase <b>{nextEncounter?.phase ?? phase}</b></span>
          <span>완료한 전투 <b>{completedBattles} / 12</b></span>
        </div>
        <div className="encounter-continue-actions">
          <button className="menu-primary" type="button" disabled={disabled || !nextEncounter} onClick={onContinue}>다음 전투</button>
          <button className="menu-secondary" type="button" disabled={disabled} onClick={onReturnToMenu}>메인 메뉴</button>
        </div>
      </section>
    </main>
  );
}
