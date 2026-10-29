import {
  GameRuleError,
  acknowledgeVictory,
  advanceRun,
  attackAllReadyMinions,
  attackWithMinion,
  castSpell,
  chooseReward,
  chooseRewardAndDiscard,
  createRun,
  discardBeforeDraw,
  endPlayerTurnWithPlayback,
  fuseMinions,
  gameConstants,
  hydrateRunForCurrentBattle,
  playMinion,
  redrawOpeningHand,
  skipReward,
  useHeroPower,
  type PlayerClass,
  type RunState,
  type EnemyTurnPlaybackStep,
  type TurnTimerState,
} from "@board-game/game-core";
import { collectCombatEffectEvents, collectEnemyActionEffects, type CombatEffectEvent } from "./combatEffects.js";

export type GameAction =
  | { type: "start-run"; seed: number; playerClass: PlayerClass }
  | { type: "restore-run"; run: RunState }
  | { type: "redraw-opening-hand" }
  | { type: "set-turn-timer"; timer: TurnTimerState | undefined }
  | { type: "clear-run" }
  | { type: "select-card"; instanceId: string }
  | { type: "select-attacker"; instanceId: string }
  | { type: "select-hero-power" }
  | { type: "use-hero-power"; targetId?: string }
  | { type: "cancel-selection" }
  | { type: "play-minion"; instanceId: string; slotIndex?: number }
  | { type: "cast-spell"; instanceId: string; targetId?: string }
  | { type: "attack"; attackerId: string; targetId: string }
  | { type: "all-attack" }
  | { type: "finish-all-attack" }
  | { type: "enemy-defeat-effect-complete" }
  | { type: "fuse-minions"; firstMinionId: string; secondMinionId: string }
  | { type: "end-turn" }
  | { type: "discard-before-draw"; instanceId: string }
  | { type: "choose-reward"; cardId: string }
  | { type: "select-reward-for-discard"; cardId: string }
  | { type: "choose-reward-and-discard"; cardId: string; discardInstanceId: string }
  | { type: "acknowledge-victory" }
  | { type: "skip-reward" }
  | { type: "continue-run"; nextSeed?: number }
  | { type: "clear-combat-effect"; eventId: number }
  | { type: "advance-enemy-turn-playback" }
  | { type: "clear-error" };

export interface GameSession {
  run: RunState | null;
  error: string | null;
  selectedCardInstanceId: string | null;
  selectedRewardCardId: string | null;
  selectedAttackerId: string | null;
  targetMode: "none" | "spell" | "attack" | "hero-power";
  pendingDiscard: boolean;
  resolving: boolean;
  combatEffects: CombatEffectEvent[];
  nextCombatEffectId: number;
  enemyTurnPlayback: { steps: EnemyTurnPlaybackStep[]; currentIndex: number; stage: "intent" | "effect" } | null;
  autoEndTurnAfterAllAttack: boolean;
  victoryPresentation: "enemy-defeat" | "victory-reveal" | null;
}

export const initialGameSession: GameSession = {
  run: null,
  error: null,
  selectedCardInstanceId: null,
  selectedRewardCardId: null,
  selectedAttackerId: null,
  targetMode: "none",
  pendingDiscard: false,
  resolving: false,
  combatEffects: [],
  nextCombatEffectId: 1,
  enemyTurnPlayback: null,
  autoEndTurnAfterAllAttack: false,
  victoryPresentation: null,
};

type InternalAction = GameAction | { type: "resolution-start" };

function sessionForRun(run: RunState, previous: GameSession): GameSession {
  return {
    ...previous,
    run,
    error: null,
    selectedCardInstanceId: null,
    selectedRewardCardId: null,
    selectedAttackerId: null,
    targetMode: "none",
    pendingDiscard: run.battle?.pendingDiscardBeforeDraw ?? false,
    resolving: false,
    combatEffects: [],
    nextCombatEffectId: previous.nextCombatEffectId,
    enemyTurnPlayback: null,
    autoEndTurnAfterAllAttack: false,
    victoryPresentation: null,
  };
}

function sessionForEnemyTurn(resolution: ReturnType<typeof endPlayerTurnWithPlayback>, previous: GameSession): GameSession {
  const run = structuredClone(resolution.run);
  if (run.battle?.enemyTurnEvents) delete run.battle.enemyTurnEvents;
  return {
    ...sessionForRun(run, previous),
    enemyTurnPlayback: resolution.steps.length > 0 ? { steps: resolution.steps, currentIndex: 0, stage: "intent" } : null,
    combatEffects: [],
    nextCombatEffectId: previous.nextCombatEffectId,
  };
}

function sessionForAction(run: RunState, previous: GameSession, action: GameAction): GameSession {
  if (!previous.run) return sessionForRun(run, previous);
  const events = collectCombatEffectEvents(previous.run, run, action, previous.nextCombatEffectId);
  const nextRun = run.battle && Object.prototype.hasOwnProperty.call(run.battle, "enemyTurnEvents") ? structuredClone(run) : run;
  if (nextRun.battle?.enemyTurnEvents) delete nextRun.battle.enemyTurnEvents;
  const next = sessionForRun(nextRun, previous);
  return {
    ...next,
    combatEffects: [...previous.combatEffects, ...events],
    nextCombatEffectId: previous.nextCombatEffectId + events.length,
  };
}

function ruleMessage(error: GameRuleError): string {
  const messages: Record<GameRuleError["code"], string> = {
    INVALID_ACTION: "지금은 할 수 없는 행동입니다.",
    INSUFFICIENT_MANA: "마나가 부족합니다.",
    INVALID_TARGET: "현재 선택할 수 없는 대상입니다.",
    MAX_BOARD: `전장에는 하수인을 ${gameConstants.maxBoard}명까지만 둘 수 있습니다.`,
    MAX_HAND: "손패가 가득 차 카드를 가져올 수 없습니다.",
    MAX_COPIES: "같은 카드는 덱에 2장까지만 넣을 수 있습니다.",
    MAX_DECK: "덱이 가득 찼습니다. 보상을 받으려면 카드 한 장을 버려야 합니다.",
    WRONG_TURN: "지금은 플레이어의 행동 차례가 아닙니다.",
    TERMINAL_RUN: "진행 중인 전투가 없습니다.",
    CARD_NOT_FOUND: "선택한 카드를 찾을 수 없습니다.",
    REWARD_NOT_PENDING: "선택할 보상이 없습니다.",
    ENCOUNTER_NOT_READY: "다음 전투를 시작할 수 없습니다.",
    DISCARD_NOT_PENDING: "지금은 버릴 카드를 선택할 수 없습니다.",
  };
  return messages[error.code];
}

export function reduceGameAction(session: GameSession, action: InternalAction): GameSession {
  if (action.type === "set-turn-timer") {
    if (!session.run) return session;
    const run = { ...session.run };
    if (action.timer) run.turnTimer = action.timer;
    else delete run.turnTimer;
    return { ...session, run };
  }
  if (action.type === "clear-combat-effect") {
    const completed = session.combatEffects.find((event) => event.id === action.eventId);
    const combatEffects = session.combatEffects.filter((event) => event.id !== action.eventId);
    return {
      ...session,
      combatEffects,
      ...(completed?.slowMotion && combatEffects.length === 0 && session.run?.pendingVictoryAcknowledgement
        ? { victoryPresentation: "enemy-defeat" as const }
        : {}),
    };
  }
  if (action.type === "enemy-defeat-effect-complete") {
    return session.victoryPresentation === "enemy-defeat" ? { ...session, victoryPresentation: "victory-reveal" } : session;
  }
  if (action.type === "clear-error") return { ...session, error: null };
  if (action.type === "clear-run") return { ...initialGameSession };
  if (action.type === "resolution-start") return { ...session, resolving: true, error: null };
  if (action.type === "advance-enemy-turn-playback") {
    const playback = session.enemyTurnPlayback;
    if (!playback) return session;
    if (playback.stage === "intent") {
      const step = playback.steps[playback.currentIndex];
      if (!step) return { ...session, enemyTurnPlayback: null, combatEffects: [] };
      const events = collectEnemyActionEffects(step.beforeRun, step.presentationRun, step.action, session.nextCombatEffectId);
      return {
        ...session,
        enemyTurnPlayback: { ...playback, stage: "effect" },
        combatEffects: events,
        nextCombatEffectId: session.nextCombatEffectId + events.length,
      };
    }
    const nextIndex = playback.currentIndex + 1;
    const nextStep = playback.steps[nextIndex];
    if (!nextStep) return { ...session, enemyTurnPlayback: null, combatEffects: [] };
    return {
      ...session,
      enemyTurnPlayback: { ...playback, currentIndex: nextIndex, stage: "intent" },
      combatEffects: [],
    };
  }
  if (action.type === "finish-all-attack") {
    const battle = session.run?.battle;
    if (!session.autoEndTurnAfterAllAttack || session.combatEffects.length > 0 || session.resolving || session.enemyTurnPlayback
      || !battle || battle.status !== "active" || battle.activeSide !== "player" || battle.enemyHero.health <= 0) {
      return session.autoEndTurnAfterAllAttack ? { ...session, autoEndTurnAfterAllAttack: false } : session;
    }
    return sessionForEnemyTurn(endPlayerTurnWithPlayback(session.run!), { ...session, autoEndTurnAfterAllAttack: false });
  }
  if (session.enemyTurnPlayback) return session;
  if (action.type === "start-run") return sessionForRun(createRun(action.seed, action.playerClass), session);
  if (action.type === "restore-run") {
    const run = hydrateRunForCurrentBattle(action.run);
    return { ...sessionForRun(run, session), victoryPresentation: run.pendingVictoryAcknowledgement ? "victory-reveal" : null };
  }
  if (action.type === "cancel-selection") {
    return { ...session, selectedCardInstanceId: null, selectedAttackerId: null, targetMode: "none", error: null };
  }
  if (action.type === "select-card") {
    if (!session.run?.battle || session.pendingDiscard || session.resolving) return session;
    return { ...session, selectedCardInstanceId: action.instanceId, selectedAttackerId: null, targetMode: "spell", error: null };
  }
  if (action.type === "select-reward-for-discard") {
    const run = session.run;
    if (!run?.pendingReward || run.pendingVictoryAcknowledgement || run.deck.length < 35 || !run.pendingReward.choices.includes(action.cardId)) return session;
    return { ...session, selectedRewardCardId: action.cardId, error: null };
  }
  if (action.type === "select-attacker") {
    const battle = session.run?.battle;
    const attacker = battle?.playerBoard.find((minion) => minion.instanceId === action.instanceId);
    if (!attacker || !battle || battle.status !== "active" || battle.activeSide !== "player" || attacker.summonedTurn >= battle.turnNumber || attacker.hasAttacked) {
      return { ...session, error: "이 하수인은 이번 턴에 공격할 수 없습니다." };
    }
    return { ...session, selectedCardInstanceId: null, selectedAttackerId: attacker.instanceId, targetMode: "attack", error: null };
  }
  if (action.type === "select-hero-power") {
    if (!session.run?.battle || session.pendingDiscard || session.resolving || session.run.playerClass !== "assassin") return session;
    return { ...session, selectedCardInstanceId: null, selectedAttackerId: null, targetMode: "hero-power", error: null };
  }

  if (!session.run) return { ...session, error: "먼저 새 원정을 시작하세요." };
  try {
    if (action.type === "redraw-opening-hand") return sessionForRun(redrawOpeningHand(session.run), session);
    if (action.type === "play-minion") return sessionForAction(playMinion(session.run, action.instanceId, action.slotIndex), session, action);
    if (action.type === "cast-spell") return sessionForAction(castSpell(session.run, action.instanceId, action.targetId), session, action);
    if (action.type === "attack") return sessionForAction(attackWithMinion(session.run, action.attackerId, action.targetId), session, action);
    if (action.type === "all-attack") {
      const next = sessionForAction(attackAllReadyMinions(session.run), session, action);
      const battle = next.run?.battle;
      return { ...next, autoEndTurnAfterAllAttack: Boolean(battle && battle.status === "active" && battle.enemyHero.health > 0) };
    }
    if (action.type === "fuse-minions") return sessionForAction(fuseMinions(session.run, action.firstMinionId, action.secondMinionId), session, action);
    if (action.type === "use-hero-power") return sessionForAction(useHeroPower(session.run, action.targetId), session, action);
    if (action.type === "end-turn") return sessionForEnemyTurn(endPlayerTurnWithPlayback(session.run), session);
    if (action.type === "discard-before-draw") return sessionForRun(discardBeforeDraw(session.run, action.instanceId), session);
    if (action.type === "choose-reward") return sessionForRun(chooseReward(session.run, action.cardId), session);
    if (action.type === "choose-reward-and-discard") return sessionForRun(chooseRewardAndDiscard(session.run, action.cardId, action.discardInstanceId), session);
    if (action.type === "acknowledge-victory") return sessionForRun(acknowledgeVictory(session.run), session);
    if (action.type === "skip-reward") return sessionForRun(skipReward(session.run), session);
    if (action.type === "continue-run") {
      if (action.nextSeed === undefined) return { ...session, error: "다음 전투의 시드를 준비하지 못했습니다." };
      return sessionForRun(advanceRun(session.run, action.nextSeed), session);
    }
  } catch (error) {
    if (error instanceof GameRuleError) return { ...session, error: ruleMessage(error), resolving: false };
    throw error;
  }
  return session;
}
