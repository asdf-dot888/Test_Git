import type { ReactElement } from "react";
import { ENEMY_BY_ID, type RunState } from "@board-game/game-core";
import { CARD_BY_ID } from "@board-game/game-core";
import type { PlayerSide } from "@board-game/game-core";
import { DiscardPicker } from "./DiscardPicker.js";
import { HeroPanel } from "./HeroPanel.js";
import { HandPanel } from "./HandPanel.js";
import { ManaDisplay } from "./ManaDisplay.js";
import { MinionLane } from "./MinionLane.js";
import { TargetPicker } from "./TargetPicker.js";
import { TurnControls } from "./TurnControls.js";

export interface GameBoardProps {
  run: RunState;
  selectedCardInstanceId: string | null;
  selectedAttackerId: string | null;
  targetMode: "none" | "spell" | "attack";
  isResolving: boolean;
  error: string | null;
  onSelectCard(instanceId: string): void;
  onSelectTarget(targetId: string): void;
  onDiscardCard(instanceId: string): void;
  onCancelTarget(): void;
  onEndTurn(): void;
  onMenu(): void;
}

function spellTargetSide(instanceId: string | null, run: RunState): PlayerSide | null {
  const card = run.battle?.hand.find((item) => item.instanceId === instanceId);
  const definition = card ? CARD_BY_ID.get(card.cardId) : undefined;
  const targetEffect = definition?.spellEffects?.find((effect) =>
    (effect.kind === "damage" && effect.target === "enemyMinion")
    || (effect.kind === "heal" && effect.target === "playerMinion")
    || effect.kind === "buff",
  );
  if (targetEffect?.kind === "damage") return "enemy";
  if (targetEffect?.kind === "heal" || targetEffect?.kind === "buff") return "player";
  return null;
}

export function GameBoard({ run, selectedCardInstanceId, selectedAttackerId, targetMode, isResolving, error, onSelectCard, onSelectTarget, onDiscardCard, onCancelTarget, onEndTurn, onMenu }: GameBoardProps): ReactElement {
  const battle = run.battle;
  if (!battle) return <main className="board-unavailable">전투를 준비하고 있습니다.</main>;
  const enemy = ENEMY_BY_ID.get(battle.enemyId);
  const actionsDisabled = isResolving || battle.activeSide !== "player" || battle.status !== "active" || Boolean(battle.pendingDiscardBeforeDraw);
  const targetSide = targetMode === "spell"
    ? spellTargetSide(selectedCardInstanceId, run)
    : targetMode === "attack"
      ? selectedAttackerId ? "enemy" : "player"
      : null;
  const enemyHeroTargetable = targetMode === "attack" && Boolean(selectedAttackerId) && battle.enemyBoard.length === 0 && !actionsDisabled;
  const canSelectCard = (instance: import("@board-game/game-core").CardInstance) => {
    const definition = CARD_BY_ID.get(instance.cardId);
    const targetSideForCard = spellTargetSide(instance.instanceId, run);
    if (definition?.kind !== "spell" || !targetSideForCard) return true;
    return targetSideForCard === "enemy" ? battle.enemyBoard.length > 0 : battle.playerBoard.length > 0;
  };

  return (
    <main className="game-shell">
      <header className="game-topbar">
        <a className="brand-mark" href="#battle" aria-label="잿빛 원정 홈"><span aria-hidden="true">✦</span> 잿빛 원정</a>
        <div className="run-meta"><span>PHASE {run.phase} <b>·</b> 전투 {run.encounterInPhase + 1} / 4</span><span className="turn-number">TURN {battle.turnNumber}</span></div>
        <button className="menu-button" type="button" onClick={onMenu}>메뉴</button>
      </header>

      <section className="battle-board" id="battle" aria-label="카드 전투 보드">
        <div className="battle-opponent">
          <HeroPanel hero={battle.enemyHero} side="enemy" artKey={enemy?.artKey ?? "unknown-enemy"} name={enemy?.name ?? "미지의 적"} targetable={enemyHeroTargetable} onSelectTarget={onSelectTarget} />
          <MinionLane side="enemy" minions={battle.enemyBoard} selectedAttackerId={selectedAttackerId} targetMode={targetMode} targetSide={targetSide} disabled={actionsDisabled} turnNumber={battle.turnNumber} onSelectTarget={onSelectTarget} />
        </div>
        <div className="board-divider" aria-hidden="true"><span>✦</span></div>
        <div className="battle-player">
          <MinionLane side="player" minions={battle.playerBoard} selectedAttackerId={selectedAttackerId} targetMode={targetMode} targetSide={targetSide} disabled={actionsDisabled} turnNumber={battle.turnNumber} onSelectTarget={onSelectTarget} />
          <HeroPanel hero={battle.playerHero} side="player" artKey="player" name="잿빛 방랑자" targetable={false} onSelectTarget={onSelectTarget} />
        </div>
        {targetMode !== "none" && <TargetPicker mode={targetMode} onCancel={onCancelTarget} />}
      </section>

      <footer className="player-controls">
        <div className="player-toolbar">
          <div className="deck-counts" aria-label={`덱 ${battle.drawPile.length}장, 버린 카드 ${battle.discardPile.length}장`}>
            <span><i aria-hidden="true">▤</i> 덱 <b>{battle.drawPile.length}</b></span>
            <span><i aria-hidden="true">▧</i> 버림 <b>{battle.discardPile.length}</b></span>
          </div>
          <ManaDisplay current={battle.playerMana.current} max={battle.playerMana.max} />
          <div className="turn-controls-spacer"><TurnControls onEndTurn={onEndTurn} status={battle.status} disabled={actionsDisabled} /></div>
        </div>
        <HandPanel cards={battle.hand} selectedCardInstanceId={selectedCardInstanceId} currentMana={battle.playerMana.current} boardSize={battle.playerBoard.length} disabled={actionsDisabled} canSelectCard={canSelectCard} onSelectCard={onSelectCard} />
      </footer>
      {error && <div className="game-error" role="alert"><span>{error}</span><button type="button" onClick={onCancelTarget}>확인</button></div>}
      {battle.pendingDiscardBeforeDraw && <DiscardPicker cards={battle.hand} disabled={isResolving} onDiscard={onDiscardCard} />}
    </main>
  );
}
