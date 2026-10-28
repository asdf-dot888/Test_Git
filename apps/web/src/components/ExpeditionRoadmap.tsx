import type { ReactElement } from "react";
import { ENEMY_BY_ID, type RunState } from "@board-game/game-core";

export interface ExpeditionRoadmapProps {
  run: RunState;
  disabled?: boolean;
  onSelectEncounter: (encounterIndex: number) => void;
  onMainMenu: () => void;
  onLeaderboard: () => void;
  onAudioSettings: () => void;
}

export function ExpeditionRoadmap({ run, disabled = false, onSelectEncounter, onMainMenu, onLeaderboard, onAudioSettings }: ExpeditionRoadmapProps): ReactElement {
  const encounters = run.encounters;
  const activeIndex = encounters.findIndex((encounter) => encounter.status === "active");
  const targetIndex = activeIndex >= 0 ? activeIndex : encounters.findIndex((encounter) => encounter.status === "pending");
  const targetEncounter = targetIndex >= 0 ? encounters[targetIndex] : undefined;
  const phase = targetEncounter?.phase ?? run.phase;
  const phaseEncounters = encounters
    .map((encounter, index) => ({ encounter, index }))
    .filter(({ encounter }) => encounter.phase === phase);

  return (
    <main className="expedition-roadmap" aria-labelledby="expedition-roadmap-title">
      <div className="expedition-roadmap__shade" aria-hidden="true" />
      <section className="expedition-roadmap__panel">
        <button className="expedition-roadmap__audio-button" type="button" aria-label="음향 설정" title="음향 설정" disabled={disabled} onClick={onAudioSettings}><span aria-hidden="true">🔊</span></button>
        <button className="expedition-roadmap__leaderboard-button" type="button" aria-label="랭킹" title="랭킹" disabled={disabled} onClick={onLeaderboard}>
          <span aria-hidden="true">♛</span>
        </button>
        <header className="expedition-roadmap__header">
          <span className="eyebrow">MANGO STONE</span>
          <h1 id="expedition-roadmap-title">원정 경로</h1>
          <p>길을 선택해 어둠 속으로 나아가세요.</p>
          <strong className="expedition-roadmap__phase">PHASE {phase}</strong>
        </header>

        {phaseEncounters.length > 0 ? (
          <div className="expedition-roadmap__route" aria-label={`페이즈 ${phase} 전투 경로`}>
            <svg className="expedition-roadmap__route-line" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
              <path d="M 135 70 C 300 110, 720 120, 850 210 S 360 295, 160 360 S 650 470, 850 530" />
              <path className="expedition-roadmap__route-glow" d="M 135 70 C 300 110, 720 120, 850 210 S 360 295, 160 360 S 650 470, 850 530" />
            </svg>
            <ol className="expedition-roadmap__nodes">
              {phaseEncounters.map(({ encounter, index }, phaseIndex) => {
                const enemy = ENEMY_BY_ID.get(encounter.enemyId);
                const enemyName = enemy?.name ?? "미지의 적";
                const encounterKind = encounter.kind === "boss" ? "보스전" : "일반 전투";
                const isTarget = index === targetIndex;
                const isActive = encounter.status === "active";
                const selectable = isTarget && (isActive || encounter.status === "pending");
                const stateLabel = isActive ? "진행 중" : encounter.status === "complete" ? "처치 완료" : selectable ? "도전 가능" : "잠김";
                const nodeClasses = [
                  "expedition-roadmap__node",
                  `expedition-roadmap__node--${phaseIndex + 1}`,
                  encounter.kind === "boss" ? "is-boss" : "",
                  encounter.status === "complete" ? "is-complete" : "",
                  isActive ? "is-active" : "",
                  selectable && !isActive ? "is-available" : "",
                ].filter(Boolean).join(" ");
                const buttonLabel = `페이즈 ${phase}, ${phaseIndex + 1}번째 전투, ${enemyName}, ${encounterKind}, ${stateLabel}`;

                return (
                  <li className={nodeClasses} key={`${encounter.phase}-${encounter.enemyId}-${index}`}>
                    <button
                      className="expedition-roadmap__node-button"
                      type="button"
                      aria-label={buttonLabel}
                      aria-current={isActive ? "step" : undefined}
                      disabled={disabled || !selectable}
                      onClick={() => onSelectEncounter(index)}
                    >
                      <span className="expedition-roadmap__portrait-frame">
                        {enemy ? <img src={`/art/enemies/${enemy.artKey}.png`} alt={`${enemyName} 초상화`} /> : <span aria-hidden="true">?</span>}
                      </span>
                      <span className="expedition-roadmap__node-copy">
                        <span className="expedition-roadmap__node-index">전투 {phaseIndex + 1}</span>
                        <strong>{enemyName}</strong>
                        <span className="expedition-roadmap__node-kind">{encounterKind}</span>
                        <span className="expedition-roadmap__node-status">{stateLabel}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : (
          <div className="expedition-roadmap__finished" role="status">
            <span aria-hidden="true">✦</span>
            <h2>원정 완료</h2>
            <p>모든 전투를 마쳤습니다.</p>
          </div>
        )}

        <footer className="expedition-roadmap__footer">
          <span>완료한 전투 {run.completedBattles} / 12</span>
          <button className="menu-secondary" type="button" disabled={disabled} onClick={onMainMenu}>메인 메뉴</button>
        </footer>
      </section>
    </main>
  );
}
