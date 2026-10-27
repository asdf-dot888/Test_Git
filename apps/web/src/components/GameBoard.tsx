import type { ReactElement } from "react";
import { ENEMY_BY_ID, type EnemyTurnPlaybackStep, type RunState } from "@board-game/game-core";
import { CARD_BY_ID } from "@board-game/game-core";
import type { PlayerSide } from "@board-game/game-core";
import type { CombatEffectEvent } from "../game/combatEffects.js";
import { CombatEffectLayer } from "./CombatEffectLayer.js";
import { DiscardPicker } from "./DiscardPicker.js";
import { EnemyHand } from "./EnemyHand.js";
import { HeroPanel } from "./HeroPanel.js";
import { HandPanel } from "./HandPanel.js";
import { ManaDisplay } from "./ManaDisplay.js";
import { MinionLane } from "./MinionLane.js";
import { TargetPicker } from "./TargetPicker.js";
import { TurnControls } from "./TurnControls.js";
import { HeroPowerControl } from "./HeroPowerControl.js";
import { EnemyIntentPreview } from "./EnemyIntentPreview.js";
import type { DragPayload, DropTarget } from "./dragInteractions.js";

export interface GameBoardProps {
  run: RunState;
  turnTimer: { text: string; remainingSeconds: number; visible: boolean };
  combatEffects?: CombatEffectEvent[];
  combatEffectsPaused?: boolean;
  onCombatEffectComplete?(eventId: number): void;
  selectedCardInstanceId: string | null;
  selectedAttackerId: string | null;
  targetMode: "none" | "spell" | "attack" | "hero-power";
  isResolving: boolean;
  actionsDisabled?: boolean;
  error: string | null;
  onSelectCard(instanceId: string): void;
  onSelectTarget(targetId: string): void;
  onDiscardCard(instanceId: string): void;
  onCancelTarget(): void;
  onEndTurn(): void;
  onMenu(): void;
  onUseHeroPower?(): void;
  onAllAttack?(): void;
  onDropInteraction?(payload: DragPayload, target: DropTarget): void;
  enemyIntentStep?: EnemyTurnPlaybackStep | null;
}

function spellTargetSide(instanceId: string | null, run: RunState): PlayerSide | null {
  const card = run.battle?.hand.find((item) => item.instanceId === instanceId);
  const definition = card ? CARD_BY_ID.get(card.cardId) : undefined;
  const targetEffect = definition?.spellEffects?.find((effect) =>
    (effect.kind === "damage" && effect.target === "enemyMinion")
    || effect.kind === "randomDamage"
    || effect.kind === "cleave"
    || (effect.kind === "heal" && effect.target === "playerMinion")
    || effect.kind === "buff",
  );
  if (targetEffect?.kind === "damage") return "enemy";
  if (targetEffect?.kind === "heal" || targetEffect?.kind === "buff") return "player";
  return null;
}

export function GameBoard({ run, turnTimer, combatEffects = [], combatEffectsPaused = false, onCombatEffectComplete, selectedCardInstanceId, selectedAttackerId, targetMode, isResolving, actionsDisabled: syncDisabled = false, error, onSelectCard, onSelectTarget, onDiscardCard, onCancelTarget, onEndTurn, onMenu, onUseHeroPower = () => undefined, onAllAttack = () => undefined, onDropInteraction, enemyIntentStep = null }: GameBoardProps): ReactElement {
  const battle = run.battle;
  if (!battle) return <main className="board-unavailable">전투를 준비하고 있습니다.</main>;
  const enemy = ENEMY_BY_ID.get(battle.enemyId);
  const intentAction = enemyIntentStep?.action;
  const intentTargetIds = intentAction?.type === "attack"
    ? [intentAction.targetId]
    : intentAction?.type === "cast-spell"
      ? intentAction.effects.map((effect) => effect.targetId).filter((id): id is string => Boolean(id))
      : intentAction?.type === "boss-area" ? intentAction.targetMinionIds : [];
  const intentHeroTarget = intentAction?.type === "attack"
    ? intentAction.targetId === battle.playerHero.id
    : intentAction?.type === "cast-spell"
      ? intentAction.effects.some((effect) => effect.targetId === battle.playerHero.id || effect.targetId === "player-hero")
      : intentAction?.type === "boss-area";
  const showTimerWarning = turnTimer.visible && turnTimer.remainingSeconds <= 5;
  const actionsDisabled = syncDisabled || isResolving || battle.activeSide !== "player" || battle.status !== "active" || Boolean(battle.pendingDiscardBeforeDraw);
  const readyMinionCount = battle.playerBoard.filter((minion) => minion.summonedTurn < battle.turnNumber && !minion.hasAttacked).length;
  const allAttackDisabled = actionsDisabled || battle.enemyBoard.length > 0 || readyMinionCount === 0;
  const targetSide = targetMode === "spell"
    ? spellTargetSide(selectedCardInstanceId, run)
    : targetMode === "hero-power"
      ? "enemy"
      : targetMode === "attack"
      ? selectedAttackerId ? "enemy" : "player"
      : null;
  const selectedSpell = battle.hand.find((item) => item.instanceId === selectedCardInstanceId);
  const selectedDefinition = selectedSpell ? CARD_BY_ID.get(selectedSpell.cardId) : undefined;
  const canTargetEnemyHeroWithSpell = selectedDefinition?.spellEffects?.some((effect) => effect.kind === "randomDamage");
  const enemyHeroTargetable = !actionsDisabled && (
    (targetMode === "attack" && Boolean(selectedAttackerId) && battle.enemyBoard.length === 0)
    || (targetMode === "hero-power" && run.playerClass === "assassin")
    || (targetMode === "spell" && Boolean(canTargetEnemyHeroWithSpell))
  );
  const canSelectCard = (instance: import("@board-game/game-core").CardInstance) => {
    const definition = CARD_BY_ID.get(instance.cardId);
    const targetSideForCard = spellTargetSide(instance.instanceId, run);
    if (definition?.kind !== "spell" || !targetSideForCard) return true;
    if (definition?.spellEffects?.some((effect) => effect.kind === "randomDamage")) return true;
    if (definition?.spellEffects?.some((effect) => effect.kind === "cleave")) return battle.enemyBoard.length > 0;
    return targetSideForCard === "enemy" ? battle.enemyBoard.length > 0 : battle.playerBoard.length > 0;
  };

  return (
    <>
    <main className="game-shell">
      <header className="game-topbar">
        <a className="brand-mark" href="#battle" aria-label="잿빛 원정 홈"><span aria-hidden="true">✦</span> 잿빛 원정</a>
        <div className="run-meta"><span>PHASE {run.phase} <b>·</b> 전투 {run.encounterInPhase + 1} / 4</span><span className="turn-number">TURN {battle.turnNumber}</span><span className={`turn-timer${turnTimer.remainingSeconds <= 5 ? " is-critical" : ""}${turnTimer.visible ? "" : " is-hidden"}`} aria-label={`남은 시간 ${turnTimer.remainingSeconds}초`} aria-live="off" aria-hidden={!turnTimer.visible}>{turnTimer.text}</span></div>
        <button className="menu-button" type="button" onClick={onMenu}>메뉴</button>
      </header>
      {enemy?.kind === "boss" && <aside className="boss-pattern-panel" data-testid="boss-pattern-panel"><strong>보스 고유 패턴</strong><span>보스의 3·6·9번째 턴 행동은 카드 행동 후 이어집니다.</span><span>광역 강타: 내 하수인과 영웅 모두에게 피해 1</span></aside>}

      <section className={`battle-board${showTimerWarning ? " is-timer-critical" : ""}`} id="battle" aria-label="카드 전투 보드">
        {enemyIntentStep && <EnemyIntentPreview step={enemyIntentStep} />}
        <div className="battle-opponent">
          <div className="enemy-resource-bar">
            <EnemyHand count={battle.enemyHand.length} instanceIds={battle.enemyHand.map((card) => card.instanceId)} />
            <div className="enemy-deck-counts" aria-label={`적 덱 ${battle.enemyDrawPile.length}장, 적 버린 카드 ${battle.enemyDiscardPile.length}장`}>
              <span>덱 <b>{battle.enemyDrawPile.length}</b></span>
              <span>버림 <b>{battle.enemyDiscardPile.length}</b></span>
            </div>
            <ManaDisplay current={battle.enemyMana.current} max={battle.enemyMana.max} />
          </div>
          <HeroPanel hero={battle.enemyHero} side="enemy" artKey={enemy?.artKey ?? "unknown-enemy"} name={enemy?.name ?? "미지의 적"} targetable={enemyHeroTargetable} onSelectTarget={onSelectTarget} onDropTarget={(payload, target) => onDropInteraction?.(payload, target)} />
          <MinionLane side="enemy" minions={battle.enemyBoard} selectedAttackerId={selectedAttackerId} targetMode={targetMode} targetSide={targetSide} disabled={actionsDisabled} turnNumber={battle.turnNumber} onSelectTarget={onSelectTarget} onDropTarget={(payload, target) => onDropInteraction?.(payload, target)} />
        </div>
        <div className="board-divider" aria-hidden="true"><span>✦</span></div>
        <div className="battle-player">
          <MinionLane side="player" minions={battle.playerBoard} selectedAttackerId={selectedAttackerId} targetMode={targetMode} targetSide={targetSide} disabled={actionsDisabled} turnNumber={battle.turnNumber} onSelectTarget={onSelectTarget} onDropTarget={(payload, target) => onDropInteraction?.(payload, target)} intentTargetIds={intentTargetIds} />
          <HeroPanel hero={battle.playerHero} side="player" artKey="player" name="잿빛 방랑자" armor={battle.playerArmor} targetable={false} intentTarget={intentHeroTarget} onSelectTarget={onSelectTarget} />
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
          <HeroPowerControl
            {...(run.playerClass ? { playerClass: run.playerClass } : {})}
            currentMana={battle.playerMana.current}
            used={battle.heroPowerUsed}
            active={battle.activeSide === "player" && battle.status === "active"}
            resolving={isResolving || syncDisabled}
            shardCount={battle.soulShards}
            boardSize={battle.playerBoard.length}
            targetMode={targetMode === "hero-power"}
            onActivate={onUseHeroPower}
          />
          <button className={`all-attack-button${allAttackDisabled ? " is-unavailable" : " is-ready"}`} type="button" disabled={allAttackDisabled} aria-label={`전체 공격, 공격 가능한 하수인 ${readyMinionCount}명`} onClick={onAllAttack} title={battle.enemyBoard.length > 0 ? "적 하수인이 남아 있으면 사용할 수 없습니다." : "공격 가능한 아군 하수인을 모두 순서대로 적 영웅에게 보냅니다."}>전체 공격</button>
          <div className="turn-controls-spacer"><TurnControls onEndTurn={onEndTurn} status={battle.status} disabled={actionsDisabled} /></div>
        </div>
        <HandPanel cards={battle.hand} selectedCardInstanceId={selectedCardInstanceId} currentMana={battle.playerMana.current} boardSize={battle.playerBoard.length} disabled={actionsDisabled} canSelectCard={canSelectCard} onSelectCard={onSelectCard} />
      </footer>
      {error && <div className="game-error" role="alert"><span>{error}</span><button type="button" onClick={onCancelTarget}>확인</button></div>}
      {battle.pendingDiscardBeforeDraw && <DiscardPicker cards={battle.hand} disabled={actionsDisabled} onDiscard={onDiscardCard} />}
    </main>
    <CombatEffectLayer events={combatEffects} paused={combatEffectsPaused} onComplete={(eventId) => onCombatEffectComplete?.(eventId)} />
    </>
  );
}
