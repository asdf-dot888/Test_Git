import { useState, type ReactElement } from "react";
import { ENEMY_BY_ID, gameConstants, getLegalAttackTargets, type EnemyTurnPlaybackStep, type RunState } from "@board-game/game-core";
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
import { sameDropTarget } from "./touchDrag.js";
import type { DragState } from "./useTouchDrag.js";
import { TargetPicker } from "./TargetPicker.js";
import { EndTurnButton, TurnControls } from "./TurnControls.js";
import { HeroPowerControl } from "./HeroPowerControl.js";
import { EnemyIntentPreview } from "./EnemyIntentPreview.js";
import { OpeningHandRedrawControl } from "./OpeningHandRedrawControl.js";
import type { DragPayload, DropTarget } from "./dragInteractions.js";
import { getValidDropTargets } from "../game/dropRules.js";
import { useCompactBoard } from "../game/useCompactBoard.js";
import { getPlayerSpellSelection } from "../game/spellTargeting.js";
import type { TutorialStepId } from "./FirstRunTutorial.js";

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
  /** True while the enemy turn is replayed step by step (the board still shows the player as active). */
  enemyTurnActive?: boolean;
  actionsDisabled?: boolean;
  error: string | null;
  onSelectCard(instanceId: string): void;
  onSelectTarget(targetId: string): void;
  onDiscardCard(instanceId: string): void;
  onCancelTarget(): void;
  onEndTurn(): void;
  onRedrawOpeningHand?(): void;
  onMenu(): void;
  onUseHeroPower?(): void;
  onDropInteraction?(payload: DragPayload, target: DropTarget): void;
  enemyIntentStep?: EnemyTurnPlaybackStep | null;
  tutorialStep?: TutorialStepId;
}

function spellTargetSide(instanceId: string | null, run: RunState): PlayerSide | null {
  const card = run.battle?.hand.find((item) => item.instanceId === instanceId);
  const definition = card ? CARD_BY_ID.get(card.cardId) : undefined;
  const selection = getPlayerSpellSelection(definition);
  if (selection === "enemy-minion" || selection === "enemy-character") return "enemy";
  if (selection === "friendly-minion") return "player";
  return null;
}

export function GameBoard({ run, turnTimer, combatEffects = [], combatEffectsPaused = false, onCombatEffectComplete, selectedCardInstanceId, selectedAttackerId, targetMode, isResolving, enemyTurnActive = false, actionsDisabled: syncDisabled = false, error, onSelectCard, onSelectTarget, onDiscardCard, onCancelTarget, onEndTurn, onRedrawOpeningHand = () => undefined, onMenu, onUseHeroPower = () => undefined, onDropInteraction, enemyIntentStep = null, tutorialStep }: GameBoardProps): ReactElement {
  // Touch drag progress: which targets to outline and which one is under the finger.
  const [dragState, setDragState] = useState<DragState | null>(null);
  const compactBoard = useCompactBoard();
  const dropHighlights = { valid: dragState?.valid ?? [], hovered: dragState?.hovered ?? null };
  const getValidTargets = (payload: DragPayload) => getValidDropTargets(run, payload);
  const battle = run.battle;
  if (!battle) return <main className="board-unavailable">전투를 준비하고 있습니다.</main>;
  const playerHeroArtKey = run.playerClass ?? "player";
  const enemy = ENEMY_BY_ID.get(battle.enemyId);
  const intentAction = enemyIntentStep?.action;
  const intentTargetIds = intentAction?.type === "attack"
    ? [intentAction.targetId]
    : intentAction?.type === "cast-spell"
      ? intentAction.effects.map((effect) => effect.targetId).filter((id): id is string => battle.playerBoard.some((minion) => minion.instanceId === id))
      : intentAction?.type === "boss-area" ? intentAction.targetMinionIds : [];
  const intentHeroTarget = intentAction?.type === "all-attack"
    ? true
    : intentAction?.type === "attack"
    ? intentAction.targetId === battle.playerHero.id
    : intentAction?.type === "cast-spell"
      ? intentAction.effects.some((effect) => effect.targetId === battle.playerHero.id || effect.targetId === "player-hero"
        || (effect.targetId === null && (effect.kind === "damage" || effect.kind === "randomDamage")))
      : intentAction?.type === "boss-area";
  const bossAreaCadence = gameConstants.bossAreaCadence[run.difficulty === "hard" ? "hard" : "normal"];
  const bossAreaTurns = [1, 2, 3].map((multiple) => multiple * bossAreaCadence).join("·");
  const turnLive = battle.status === "active";
  const turnSide: "player" | "enemy" = enemyTurnActive || battle.activeSide === "enemy" ? "enemy" : "player";
  const showTimerWarning = turnTimer.visible && turnTimer.remainingSeconds <= 5;
  const actionsDisabled = syncDisabled || isResolving || battle.activeSide !== "player" || battle.status !== "active" || Boolean(battle.pendingDiscardBeforeDraw);
  const fieldActionsDisabled = actionsDisabled || (tutorialStep !== undefined && tutorialStep !== "attack" && !(tutorialStep === "play-card" && targetMode === "spell"));
  const canEndTurn = tutorialStep === undefined || tutorialStep === "end-first-turn" || tutorialStep === "end-second-turn";
  const readyMinionCount = battle.playerBoard.filter((minion) => minion.summonedTurn < battle.turnNumber && !minion.hasAttacked && !minion.statusEffects?.some((status) => status.kind === "root")).length;
  // Hearthstone attack rules: a taunt minion must be attacked first; without one any minion or the hero can be attacked.
  const legalAttackTargets = getLegalAttackTargets(battle, "player");
  // A minion is being aimed: selected for an attack, or dragged by touch.
  const aimingMinion = (targetMode === "attack" && Boolean(selectedAttackerId)) || dragState?.payload.kind === "minion";
  const blockedEnemyTargetIds = aimingMinion
    ? battle.enemyBoard.filter((minion) => !legalAttackTargets.minionIds.includes(minion.instanceId)).map((minion) => minion.instanceId)
    : [];
  const targetSide = targetMode === "spell"
    ? spellTargetSide(selectedCardInstanceId, run)
    : targetMode === "hero-power"
      ? "enemy"
      : targetMode === "attack"
      ? selectedAttackerId ? "enemy" : "player"
      : null;
  const selectedSpell = battle.hand.find((item) => item.instanceId === selectedCardInstanceId);
  const selectedDefinition = selectedSpell ? CARD_BY_ID.get(selectedSpell.cardId) : undefined;
  const canTargetEnemyHeroWithSpell = getPlayerSpellSelection(selectedDefinition) === "enemy-character";
  const enemyHeroTargetable = !actionsDisabled && (
    (targetMode === "attack" && Boolean(selectedAttackerId) && legalAttackTargets.heroAllowed)
    || (targetMode === "hero-power" && run.playerClass === "assassin")
    || (targetMode === "spell" && Boolean(canTargetEnemyHeroWithSpell))
  );
  const canSelectCard = (instance: import("@board-game/game-core").CardInstance) => {
    const definition = CARD_BY_ID.get(instance.cardId);
    const selection = getPlayerSpellSelection(definition);
    if (selection === "enemy-minion") return battle.enemyBoard.some((minion) => minion.health > 0);
    if (selection === "friendly-minion") return battle.playerBoard.some((minion) => minion.health > 0);
    return true;
  };

  return (
    <>
    <main className={`game-shell${enemy?.kind === "boss" ? " has-boss-pattern" : ""}`}>
      <header className="game-topbar">
        <a className="brand-mark" href="#battle" aria-label="망고스톤 홈"><span aria-hidden="true">✦</span> 망고스톤</a>
        <div className="run-meta"><span>PHASE {run.phase} <b>·</b> 전투 {run.encounterInPhase + 1} / 4</span><span className="turn-number">TURN {battle.turnNumber}</span>{turnLive && <span className={`turn-badge is-${turnSide}`} role="status" aria-live="polite">{turnSide === "player" ? "내 턴" : "상대 턴"}</span>}<span className={`turn-timer${turnTimer.remainingSeconds <= 5 ? " is-critical" : ""}${turnTimer.visible ? "" : " is-hidden"}`} aria-label={`남은 시간 ${turnTimer.remainingSeconds}초`} aria-live="off" aria-hidden={!turnTimer.visible}>{turnTimer.text}</span></div>
        <button className="menu-button" type="button" onClick={onMenu}>메뉴</button>
      </header>
      {enemy?.kind === "boss" && <aside className="boss-pattern-panel" data-testid="boss-pattern-panel"><strong>보스 고유 패턴</strong><span>보스의 {bossAreaTurns}번째 턴 행동은 카드 행동 후 이어집니다.</span><span>광역 강타: 내 하수인과 영웅 모두에게 피해 1</span></aside>}

      <section className={`battle-board${turnLive ? ` is-${turnSide}-turn` : ""}${showTimerWarning ? " is-timer-critical" : ""}`} id="battle" aria-label="카드 전투 보드">
        {enemyIntentStep && <EnemyIntentPreview step={enemyIntentStep} />}
        <div className="battle-opponent">
          <div className="enemy-resource-bar">
            <EnemyHand count={battle.enemyHand.length} instanceIds={battle.enemyHand.map((card) => card.instanceId)} />
            <div className="enemy-deck-counts" aria-label={`적 덱 ${battle.enemyDrawPile.length}장, 적 버린 카드 ${battle.enemyDiscardPile.length}장`}>
              <span>덱 <b>{battle.enemyDrawPile.length}</b></span>
              <span>버림 <b>{battle.enemyDiscardPile.length}</b></span>
            </div>
            <ManaDisplay current={battle.enemyMana.current} max={battle.enemyMana.max} temporary={battle.enemyMana.temporary} />
          </div>
          <HeroPanel hero={battle.enemyHero} side="enemy" artKey={enemy?.artKey ?? "unknown-enemy"} name={enemy?.name ?? "미지의 적"} targetable={enemyHeroTargetable} blocked={aimingMinion && !legalAttackTargets.heroAllowed} onSelectTarget={onSelectTarget} onDropTarget={(payload, target) => onDropInteraction?.(payload, target)} dropHighlight={dropHighlights.valid.some((target) => sameDropTarget(target, { kind: "hero", side: "enemy" })) ? (sameDropTarget(dropHighlights.hovered, { kind: "hero", side: "enemy" }) ? "hover" : "valid") : null} />
          <MinionLane side="enemy" minions={battle.enemyBoard} blockedTargetIds={blockedEnemyTargetIds} tapDetails={targetMode !== "hero-power"} dropHighlights={dropHighlights} selectedAttackerId={selectedAttackerId} targetMode={targetMode} targetSide={targetSide} disabled={fieldActionsDisabled} turnNumber={battle.turnNumber} onSelectTarget={onSelectTarget} onDropTarget={(payload, target) => onDropInteraction?.(payload, target)} />
        </div>
        <div className="board-divider" aria-hidden="true"><span>✦</span></div>
        <div className="battle-player">
          <MinionLane side="player" minions={battle.playerBoard} tapDetails={targetMode !== "hero-power"} dropHighlights={dropHighlights} getValidTargets={getValidTargets} onDragStateChange={setDragState} selectedAttackerId={selectedAttackerId} targetMode={targetMode} targetSide={targetSide} disabled={fieldActionsDisabled} turnNumber={battle.turnNumber} onSelectTarget={onSelectTarget} onDropTarget={(payload, target) => onDropInteraction?.(payload, target)} intentTargetIds={intentTargetIds} />
          <HeroPanel
            hero={battle.playerHero}
            side="player"
            artKey={playerHeroArtKey}
            name="잿빛 방랑자"
            armor={battle.playerArmor}
            topControl={compactBoard ? <EndTurnButton className="hero-end-turn-button" onEndTurn={onEndTurn} status={battle.status} disabled={actionsDisabled || !canEndTurn} /> : undefined}
            targetable={false}
            intentTarget={intentHeroTarget}
            onSelectTarget={onSelectTarget}
            heroPowerControl={(
              <HeroPowerControl
                {...(run.playerClass ? { playerClass: run.playerClass } : {})}
                currentMana={battle.playerMana.current}
                used={battle.heroPowerUsed}
                active={tutorialStep === undefined && battle.activeSide === "player" && battle.status === "active"}
                resolving={isResolving || syncDisabled}
                shardCount={battle.soulShards}
                boardSize={battle.playerBoard.length}
                targetMode={targetMode === "hero-power"}
                onActivate={onUseHeroPower}
                getValidTargets={getValidTargets}
                onDrop={(payload, target) => onDropInteraction?.(payload, target)}
                onDragStateChange={setDragState}
              />
            )}
          />
        </div>
        {targetMode !== "none" && <TargetPicker mode={targetMode} onCancel={onCancelTarget} />}
      </section>

      <footer className="player-controls">
        <div className="player-toolbar">
          <div className="deck-counts" aria-label={`덱 ${battle.drawPile.length}장, 버린 카드 ${battle.discardPile.length}장`}>
            <span><i aria-hidden="true">▤</i> 덱 <b>{battle.drawPile.length}</b></span>
            <span><i aria-hidden="true">▧</i> 버림 <b>{battle.discardPile.length}</b></span>
            {run.openingHandRedrawAvailable === true && <OpeningHandRedrawControl disabled={actionsDisabled} onRedraw={onRedrawOpeningHand} />}
          </div>
          <ManaDisplay current={battle.playerMana.current} max={battle.playerMana.max} temporary={battle.playerMana.temporary} />
          <div className="turn-controls-spacer"><TurnControls showEndTurn={!compactBoard} onEndTurn={onEndTurn} status={battle.status} disabled={actionsDisabled || !canEndTurn} /></div>
        </div>
        <HandPanel cards={battle.hand} selectedCardInstanceId={selectedCardInstanceId} currentMana={battle.playerMana.current} boardSize={battle.playerBoard.length} disabled={actionsDisabled || (tutorialStep !== undefined && tutorialStep !== "play-card" && !(tutorialStep === "attack" && readyMinionCount === 0))} canSelectCard={canSelectCard} onSelectCard={onSelectCard} getValidTargets={getValidTargets} onDragStateChange={setDragState} {...(onDropInteraction ? { onDropInteraction } : {})} />
      </footer>
      {error && <div className="game-error" role="alert"><span>{error}</span><button type="button" onClick={onCancelTarget}>확인</button></div>}
      {battle.pendingDiscardBeforeDraw && <DiscardPicker cards={battle.hand} disabled={actionsDisabled} onDiscard={onDiscardCard} />}
    </main>
    <CombatEffectLayer events={combatEffects} paused={combatEffectsPaused} onComplete={(eventId) => onCombatEffectComplete?.(eventId)} />
    </>
  );
}
