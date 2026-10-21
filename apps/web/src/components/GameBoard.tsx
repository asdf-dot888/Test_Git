import type { ReactElement } from "react";
import { ENEMY_BY_ID, type RunState } from "@board-game/game-core";
import { HeroPanel } from "./HeroPanel.js";
import { HandPanel } from "./HandPanel.js";
import { ManaDisplay } from "./ManaDisplay.js";
import { MinionLane } from "./MinionLane.js";
import { TurnControls } from "./TurnControls.js";

export interface GameBoardProps {
  run: RunState;
  selectedCardInstanceId: string | null;
  selectedAttackerId: string | null;
  targetMode: "none" | "spell" | "attack";
  onSelectCard(instanceId: string): void;
  onSelectTarget(targetId: string): void;
  onEndTurn(): void;
}

export function GameBoard({ run, selectedCardInstanceId, selectedAttackerId, targetMode, onSelectCard, onSelectTarget, onEndTurn }: GameBoardProps): ReactElement {
  const battle = run.battle;
  if (!battle) return <main className="board-unavailable">전투를 준비하고 있습니다.</main>;
  const enemy = ENEMY_BY_ID.get(battle.enemyId);

  return (
    <main className="game-shell">
      <header className="game-topbar">
        <a className="brand-mark" href="#battle" aria-label="잿빛 원정 홈"><span aria-hidden="true">✦</span> 잿빛 원정</a>
        <div className="run-meta"><span>PHASE {run.phase} <b>·</b> 전투 {run.encounterInPhase + 1} / 4</span><span className="turn-number">TURN {battle.turnNumber}</span></div>
      </header>

      <section className="battle-board" id="battle" aria-label="카드 전투 보드">
        <div className="battle-opponent">
          <HeroPanel hero={battle.enemyHero} side="enemy" artKey={enemy?.artKey ?? "unknown-enemy"} name={enemy?.name ?? "미지의 적"} targetMode={targetMode} onSelectTarget={onSelectTarget} />
          <MinionLane side="enemy" minions={battle.enemyBoard} selectedAttackerId={selectedAttackerId} targetMode={targetMode} onSelectTarget={onSelectTarget} />
        </div>
        <div className="board-divider" aria-hidden="true"><span>✦</span></div>
        <div className="battle-player">
          <MinionLane side="player" minions={battle.playerBoard} selectedAttackerId={selectedAttackerId} targetMode={targetMode} onSelectTarget={onSelectTarget} />
          <HeroPanel hero={battle.playerHero} side="player" artKey="player" name="잿빛 방랑자" targetMode={targetMode} onSelectTarget={onSelectTarget} />
        </div>
      </section>

      <footer className="player-controls">
        <div className="player-toolbar">
          <div className="deck-counts" aria-label={`덱 ${battle.drawPile.length}장, 버린 카드 ${battle.discardPile.length}장`}>
            <span><i aria-hidden="true">▤</i> 덱 <b>{battle.drawPile.length}</b></span>
            <span><i aria-hidden="true">▧</i> 버림 <b>{battle.discardPile.length}</b></span>
          </div>
          <ManaDisplay current={battle.playerMana.current} max={battle.playerMana.max} />
          <div className="turn-controls-spacer"><TurnControls onEndTurn={onEndTurn} status={battle.status} /></div>
        </div>
        <HandPanel cards={battle.hand} selectedCardInstanceId={selectedCardInstanceId} currentMana={battle.playerMana.current} onSelectCard={onSelectCard} />
      </footer>
    </main>
  );
}
