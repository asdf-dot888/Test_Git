import { useCallback, useEffect, useRef, useState } from "react";
import { CARD_BY_ID, ENEMY_BY_ID, type PlayerClass } from "@board-game/game-core";
import { AbandonRunDialog } from "./components/AbandonRunDialog.js";
import { VictoryScreen } from "./components/VictoryScreen.js";
import { GameBoard } from "./components/GameBoard.js";
import { ExpeditionRoadmap } from "./components/ExpeditionRoadmap.js";
import { MainMenu } from "./components/MainMenu.js";
import { ClassSelectionScreen } from "./components/ClassSelectionScreen.js";
import type { DragPayload, DropTarget } from "./components/dragInteractions.js";
import { RewardScreen } from "./components/RewardScreen.js";
import { DeckLimitDialog } from "./components/DeckLimitDialog.js";
import { DiscardPicker } from "./components/DiscardPicker.js";
import { GameMenu } from "./components/GameMenu.js";
import { TurnStartGlow } from "./components/TurnStartGlow.js";
import { LeaderboardModal, type LeaderboardLoadState } from "./components/LeaderboardModal.js";
import { useGameSession } from "./game/useGameSession.js";
import { useLocalRun, type LocalRunController } from "./game/useLocalRun.js";
import { useTurnTimer } from "./game/useTurnTimer.js";
import { useEnemyTurnPlayback } from "./game/useEnemyTurnPlayback.js";
import { createAudioController, type AudioController, type AudioSettings } from "./game/audio.js";
import type { GameAction } from "./game/gameActions.js";
import { loadAudioSettings, saveAudioSettings } from "./game/audioSettings.js";
import { getTopTen, LeaderboardApiError, submitProgress, type LeaderboardRecord } from "./leaderboard/leaderboardClient.js";
import { useAuth } from "./auth/useAuth.js";

function secureSeed(): number {
  const seed = new Uint32Array(1);
  globalThis.crypto.getRandomValues(seed);
  return seed[0] ?? 1;
}

export function App() {
  const sync = useLocalRun();
  return <GameSessionView sync={sync} />;
}

export function GameSessionView({ sync }: { sync: LocalRunController }) {
  return <>
    {sync.warning && <aside className="run-sync-banner" role="status">{sync.warning}</aside>}
    <GameSessionContent sync={sync} />
  </>;
}

function GameSessionContent({ sync }: { sync: LocalRunController }) {
  const auth = useAuth();
  const { session, dispatch: dispatchGameAction } = useGameSession();
  const { loaded: syncLoaded, status: syncStatus, run: syncedRun, saveRun } = sync;
  const [screen, setScreen] = useState<"menu" | "class-selection" | "map" | "game">("menu");
  const [classSelectionReason, setClassSelectionReason] = useState<"completed" | "abandoned" | null>(null);
  const [deckLimitPromptedKey, setDeckLimitPromptedKey] = useState<string | null>(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [leaderboardState, setLeaderboardState] = useState<LeaderboardLoadState>("loading");
  const [leaderboardRecords, setLeaderboardRecords] = useState<LeaderboardRecord[]>([]);
  const [leaderboardError, setLeaderboardError] = useState<string | undefined>();
  const [pendingLeaderboardProgress, setPendingLeaderboardProgress] = useState<number | null>(null);
  const [leaderboardNotice, setLeaderboardNotice] = useState<string | null>(null);
  const [abandonOpen, setAbandonOpen] = useState(false);
  const [menuView, setMenuView] = useState<"closed" | "choices" | "settings">("closed");
  const [abandonToMenuOpen, setAbandonToMenuOpen] = useState(false);
  const [abandonToMenuBusy, setAbandonToMenuBusy] = useState(false);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() => loadAudioSettings());
  const [audioController, setAudioController] = useState<AudioController | null>(null);
  const appliedLoadVersion = useRef(0);
  const restoringSavedRun = useRef(false);
  const pendingReplacement = useRef(false);
  const playedAudioEventIds = useRef(new Set<number>());
  const startedTurnIds = useRef(new Set<string>());
  const lastObservedRunId = useRef<string | null>(null);
  const lastObservedLoadVersion = useRef<number | null>(null);
  const lastObservedTurnId = useRef<string | null>(null);
  const pendingTurnCueId = useRef<string | null>(null);
  const [turnStartGlowId, setTurnStartGlowId] = useState<string | null>(null);
  const warningTurnId = useRef<string | null>(null);
  const lastWarningSecond = useRef<number | null>(null);
  const submittedProgressIds = useRef(new Set<string>());
  const run = session.run;
  const playback = session.enemyTurnPlayback;
  const playbackStep = playback?.steps[playback.currentIndex];
  const displayRun = playbackStep ? (playback?.stage === "intent" ? playbackStep.beforeRun : playbackStep.presentationRun) : run;
  const battle = displayRun?.battle;
  const rewardLimitKey = run?.pendingReward && run.deck.length >= 35
    ? `${run.runId}:${run.pendingReward.encounterIndex}`
    : null;
  const enemyKind = battle ? ENEMY_BY_ID.get(battle.enemyId)?.kind : undefined;
  const activeTurnId = screen === "game" && !playback && run?.battle?.activeSide === "player" && run.battle.status === "active"
    ? `${run.battle.battleId}:${run.battle.turnNumber}`
    : null;
  const dispatch = useCallback((action: GameAction) => {
    if (action.type === "end-turn") audioController?.playEffect("turn-end");
    dispatchGameAction(action);
  }, [audioController, dispatchGameAction]);
  const turnTimer = useTurnTimer({
    run: run ?? null,
    paused: screen !== "game" || menuView !== "closed" || session.resolving || Boolean(playback) || session.combatEffects.length > 0,
    onTimerChange: (timer) => dispatch({ type: "set-turn-timer", timer }),
    onTimeout: () => dispatch({ type: "end-turn" }),
  });

  useEnemyTurnPlayback({
    active: Boolean(playback),
    stepKey: playback?.currentIndex ?? null,
    paused: screen !== "game" || menuView !== "closed",
    hasEffects: session.combatEffects.length > 0,
    onAdvance: () => dispatchGameAction({ type: "advance-enemy-turn-playback" }),
  });

  useEffect(() => {
    const controller = createAudioController();
    let active = true;
    queueMicrotask(() => {
      if (active) setAudioController(controller);
    });
    return () => {
      active = false;
      controller.dispose();
    };
  }, []);

  useEffect(() => {
    audioController?.setSettings(audioSettings);
    saveAudioSettings(audioSettings);
  }, [audioController, audioSettings]);

  useEffect(() => {
    if (!audioController) return;
    audioController.playMusic(enemyKind === "boss" ? "boss" : "normal");
  }, [audioController, enemyKind]);

  useEffect(() => {
    if (!audioController) return;
    for (const event of session.combatEffects) {
      if (playedAudioEventIds.current.has(event.id)) continue;
      playedAudioEventIds.current.add(event.id);
      for (const cue of event.soundCues) audioController.playEffect(cue);
    }
  }, [audioController, session.combatEffects]);

  useEffect(() => {
    if (!activeTurnId || !run) return;
    if (lastObservedRunId.current !== run.runId || lastObservedLoadVersion.current !== sync.loadVersion) {
      lastObservedRunId.current = run.runId;
      lastObservedLoadVersion.current = sync.loadVersion;
      lastObservedTurnId.current = activeTurnId;
      return;
    }

    const previousTurnId = lastObservedTurnId.current;
    lastObservedTurnId.current = activeTurnId;
    if (previousTurnId && previousTurnId !== activeTurnId && !startedTurnIds.current.has(activeTurnId)) {
      startedTurnIds.current.add(activeTurnId);
      pendingTurnCueId.current = activeTurnId;
      setTurnStartGlowId(activeTurnId);
    }

    if (audioController && pendingTurnCueId.current === activeTurnId) {
      audioController.playEffect("turn-start");
      pendingTurnCueId.current = null;
    }
  }, [activeTurnId, audioController, run, sync.loadVersion]);

  useEffect(() => {
    if (warningTurnId.current !== activeTurnId) {
      warningTurnId.current = activeTurnId;
      lastWarningSecond.current = null;
    }
    if (!audioController || !activeTurnId || turnTimer.isPaused) return;
    const seconds = turnTimer.remainingSeconds;
    if (seconds > 5) {
      lastWarningSecond.current = null;
      return;
    }
    if (seconds >= 1 && lastWarningSecond.current !== seconds) {
      lastWarningSecond.current = seconds;
      audioController.playEffect("timer-warning", 0.4);
    }
  }, [activeTurnId, audioController, turnTimer.isPaused, turnTimer.remainingSeconds]);

  useEffect(() => {
    if (!audioController) return;
    const onPointerDown = (event: PointerEvent) => {
      void audioController.unlock();
      if (!(event.target instanceof Element)) return;
      const control = event.target.closest<HTMLElement>("button, a[href], input, select, textarea, label[for], [role='button'], [role='option'], [data-pointer-interaction]");
      if (!control || control.matches(":disabled") || control.getAttribute("aria-disabled") === "true") return;
      audioController.playEffect("ui-click");
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [audioController]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (screen !== "game" || !battle || battle.status !== "active") return;
        event.preventDefault();
        if (menuView === "closed") setMenuView("choices");
        else if (menuView === "settings") setMenuView("choices");
        else setMenuView("closed");
        return;
      }
      if (screen !== "game") return;
      if (["Tab", "Enter", " ", "Spacebar", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [battle, menuView, screen]);

  useEffect(() => {
    if (sync.loadVersion <= appliedLoadVersion.current) return;
    appliedLoadVersion.current = sync.loadVersion;
    restoringSavedRun.current = true;
    dispatch(sync.run ? { type: "restore-run", run: sync.run } : { type: "clear-run" });
  }, [dispatch, sync.loadVersion, sync.run]);

  useEffect(() => {
    if (pendingReplacement.current) return;
    if (restoringSavedRun.current) {
      restoringSavedRun.current = false;
      return;
    }
    if (!syncLoaded || (syncStatus !== "ready" && syncStatus !== "saving") || !session.run || session.run === syncedRun) return;
    void saveRun(session.run).catch(() => undefined);
  }, [saveRun, session.run, syncLoaded, syncStatus, syncedRun]);

  const startNewLocalRun = async (playerClass: PlayerClass) => {
    pendingReplacement.current = true;
    try {
      const seed = secureSeed();
      const created = classSelectionReason
        ? await sync.replaceRun(classSelectionReason, seed, playerClass)
        : await sync.createRun(seed, playerClass);
      dispatch({ type: "restore-run", run: created });
      setAbandonOpen(false);
      setClassSelectionReason(null);
      setScreen("map");
    } finally {
      pendingReplacement.current = false;
    }
  };

  const beginRun = () => {
    if (run?.status === "active") {
      setAbandonOpen(true);
      return;
    }
    setClassSelectionReason(run ? "completed" : null);
    setScreen("class-selection");
  };

  const abandonIntoClassSelection = () => {
    setAbandonOpen(false);
    setClassSelectionReason("abandoned");
    setScreen("class-selection");
  };

  const returnToBattle = () => {
    setMenuView("closed");
  };

  const loadLeaderboard = async () => {
    setLeaderboardState("loading");
    setLeaderboardError(undefined);
    try {
      const token = await auth.getLeaderboardAccessToken(true);
      setLeaderboardRecords(await getTopTen(token));
      setLeaderboardState("success");
    } catch (error) {
      setLeaderboardError(error instanceof LeaderboardApiError
        ? error.message
        : "랭킹을 불러오지 못했습니다. 로그인 권한이나 네트워크를 확인하고 다시 시도하세요.");
      setLeaderboardState("error");
    }
  };

  const openLeaderboard = () => {
    setLeaderboardOpen(true);
    void loadLeaderboard();
  };

  const closeLeaderboard = () => setLeaderboardOpen(false);

  const submitLeaderboardProgress = async (completedBattles: number, allowInteraction: boolean) => {
    try {
      const token = await auth.getLeaderboardAccessToken(allowInteraction);
      await submitProgress(token, completedBattles);
      setPendingLeaderboardProgress(null);
      setLeaderboardNotice(null);
    } catch {
      setPendingLeaderboardProgress(completedBattles);
      setLeaderboardNotice("이번 승리 기록을 랭킹에 제출하지 못했습니다. 다시 시도할 수 있습니다.");
    }
  };

  const acknowledgeVictory = () => {
    if (run) {
      const submissionId = `${run.runId}:${run.completedBattles}`;
      if (!submittedProgressIds.current.has(submissionId)) {
        submittedProgressIds.current.add(submissionId);
        void submitLeaderboardProgress(run.completedBattles, false);
      }
    }
    dispatch({ type: "acknowledge-victory" });
  };

  const retryLeaderboardProgress = () => {
    if (pendingLeaderboardProgress !== null) void submitLeaderboardProgress(pendingLeaderboardProgress, true);
  };

  const selectRoadmapEncounter = (encounterIndex: number) => {
    if (!run || (sync.status !== "ready" && sync.status !== "saving")) return;
    const encounter = run.encounters[encounterIndex];
    if (!encounter) return;
    if (encounter.status === "active") {
      setScreen("game");
      return;
    }
    const activeIndex = run.encounters.findIndex((entry) => entry.status === "active");
    const nextPendingIndex = run.encounters.findIndex((entry) => entry.status === "pending");
    if (encounter.status === "pending" && activeIndex < 0 && encounterIndex === nextPendingIndex) {
      dispatch({ type: "continue-run" });
      setScreen("game");
    }
  };

  const confirmReturnToMenu = async () => {
    if (abandonToMenuBusy) return;
    pendingReplacement.current = true;
    setAbandonToMenuBusy(true);
    try {
      await sync.deleteRun("abandoned");
      dispatch({ type: "clear-run" });
      setAbandonToMenuOpen(false);
      setMenuView("closed");
      setScreen("menu");
    } catch {
      // Keep the player in the current session if clearing local storage fails.
    } finally {
      pendingReplacement.current = false;
      setAbandonToMenuBusy(false);
    }
  };

  const selectCard = (instanceId: string) => {
    const cardInstance = battle?.hand.find((card) => card.instanceId === instanceId);
    const card = cardInstance ? CARD_BY_ID.get(cardInstance.cardId) : undefined;
    if (!card || !battle) return;
    if (card.kind === "minion") {
      dispatch({ type: "play-minion", instanceId });
      return;
    }
    const targetEffect = card.spellEffects?.find((effect) =>
      (effect.kind === "damage" && effect.target === "enemyMinion")
      || effect.kind === "randomDamage"
      || effect.kind === "cleave"
      || (effect.kind === "heal" && effect.target === "playerMinion")
      || effect.kind === "buff",
    );
    if (targetEffect) {
      dispatch({ type: "select-card", instanceId });
      return;
    }
    dispatch({ type: "cast-spell", instanceId });
  };

  const selectTarget = (targetId: string) => {
    if (!run || !battle) return;
    if (session.targetMode === "hero-power") {
      dispatch({ type: "use-hero-power", targetId: targetId === battle.enemyHero.id ? "enemy-hero" : targetId });
      return;
    }
    if (session.targetMode === "spell" && session.selectedCardInstanceId) {
      const selected = battle.hand.find(({ instanceId }) => instanceId === session.selectedCardInstanceId);
      const definition = selected ? CARD_BY_ID.get(selected.cardId) : undefined;
      const normalizedTargetId = definition?.spellEffects?.some((effect) => effect.kind === "randomDamage") && targetId === battle.enemyHero.id
        ? "enemy-hero"
        : targetId;
      dispatch({ type: "cast-spell", instanceId: session.selectedCardInstanceId, targetId: normalizedTargetId });
      return;
    }
    const friendlyMinion = battle.playerBoard.find((minion) => minion.instanceId === targetId);
    if (friendlyMinion) {
      dispatch({ type: "select-attacker", instanceId: friendlyMinion.instanceId });
      return;
    }
    if (session.selectedAttackerId) dispatch({ type: "attack", attackerId: session.selectedAttackerId, targetId });
  };

  const activateHeroPower = () => {
    if (!run?.playerClass) return;
    if (session.targetMode === "hero-power") {
      dispatch({ type: "cancel-selection" });
      return;
    }
    if (run.playerClass === "assassin") dispatch({ type: "select-hero-power" });
    else dispatch({ type: "use-hero-power" });
  };

  const handleDropInteraction = (payload: DragPayload, target: DropTarget) => {
    if (!battle) return;
    if (payload.kind === "card") {
      const card = battle.hand.find(({ instanceId }) => instanceId === payload.instanceId);
      const definition = card ? CARD_BY_ID.get(card.cardId) : undefined;
      if (!card || !definition) return;
      if (target.kind === "slot" && definition.kind === "minion") {
        dispatch({ type: "play-minion", instanceId: payload.instanceId, slotIndex: target.slotIndex });
        return;
      }
      if (definition.kind === "spell" && target.kind === "minion") {
        dispatch({ type: "cast-spell", instanceId: payload.instanceId, targetId: target.instanceId });
        return;
      }
      if (definition.kind === "spell" && target.kind === "hero" && target.side === "enemy") {
        const targetId = definition.spellEffects?.some((effect) => effect.kind === "randomDamage") ? "enemy-hero" : battle.enemyHero.id;
        dispatch({ type: "cast-spell", instanceId: payload.instanceId, targetId });
      }
      return;
    }

    const attacker = battle.playerBoard.find(({ instanceId }) => instanceId === payload.instanceId);
    if (!attacker) return;
    const canAttack = attacker.summonedTurn < battle.turnNumber && !attacker.hasAttacked;
    if (target.kind === "minion" && target.side === "enemy") {
      if (!canAttack) return;
      dispatch({ type: "attack", attackerId: attacker.instanceId, targetId: target.instanceId });
    } else if (target.kind === "hero" && target.side === "enemy") {
      if (!canAttack || battle.enemyBoard.length > 0) return;
      dispatch({ type: "attack", attackerId: attacker.instanceId, targetId: battle.enemyHero.id });
    } else if (target.kind === "minion" && target.side === "player") {
      dispatch({ type: "fuse-minions", firstMinionId: attacker.instanceId, secondMinionId: target.instanceId });
    }
  };

  const leaderboardModal = (
    <LeaderboardModal
      open={leaderboardOpen}
      state={leaderboardState}
      records={leaderboardRecords}
      {...(leaderboardError ? { errorMessage: leaderboardError } : {})}
      onClose={closeLeaderboard}
      onRetry={() => { void loadLeaderboard(); }}
    />
  );
  const leaderboardSubmitNotice = leaderboardNotice && pendingLeaderboardProgress !== null ? (
    <aside className="leaderboard-submit-notice" role="status">
      <p>{leaderboardNotice}</p>
      <button className="menu-secondary" type="button" onClick={retryLeaderboardProgress}>랭킹 제출 재시도</button>
    </aside>
  ) : null;

  if (screen === "class-selection") {
    return <ClassSelectionScreen
      disabled={sync.status !== "ready"}
      onConfirm={(playerClass) => { void startNewLocalRun(playerClass).catch(() => undefined); }}
      onCancel={() => { setClassSelectionReason(null); setScreen("menu"); }}
    />;
  }

  if (screen === "menu" || !run) {
    if (sync.status === "loading" || !sync.loaded) return <main className="auth-screen"><p role="status">저장된 원정 상태를 불러오고 있습니다…</p></main>;
    return <>
      <MainMenu canContinue={run?.status === "active" || Boolean(run?.pendingVictoryAcknowledgement || run?.pendingReward)} disabled={sync.status !== "ready" || Boolean(sync.run && !run)} onStart={beginRun} onContinue={() => setScreen(run?.pendingVictoryAcknowledgement || run?.pendingReward ? "game" : "map")} onLeaderboard={openLeaderboard} />
      {leaderboardModal}
      {leaderboardSubmitNotice}
      {sync.status === "saving" && <aside className="run-sync-banner" role="status">원정 진행 상황을 저장하고 있습니다…</aside>}
      <AbandonRunDialog open={abandonOpen} busy={sync.status === "saving"} onCancel={() => setAbandonOpen(false)} onConfirm={abandonIntoClassSelection} />
    </>;
  }

  if (run.pendingVictoryAcknowledgement) {
    return <>
      <VictoryScreen disabled={sync.status !== "ready" && sync.status !== "saving"} onConfirm={acknowledgeVictory} />
      {leaderboardSubmitNotice}
      {sync.status === "saving" && <aside className="run-sync-banner" role="status">원정 진행 상황을 저장하고 있습니다…</aside>}
    </>;
  }

  if (run.pendingReward && rewardLimitKey && deckLimitPromptedKey !== rewardLimitKey) {
    return <DeckLimitDialog
      disabled={sync.status !== "ready" && sync.status !== "saving"}
      onConfirm={() => setDeckLimitPromptedKey(rewardLimitKey)}
      onClose={() => dispatch({ type: "skip-reward" })}
    />;
  }

  if (run.pendingReward) {
    if (session.selectedRewardCardId) {
      return <>
        <DiscardPicker
          cards={run.deck}
          disabled={sync.status !== "ready" && sync.status !== "saving"}
          title="덱에서 버릴 카드 한 장을 고르세요"
          description="선택을 마치면 보상 카드를 추가하고 고른 카드를 덱에서 제거합니다."
          rewardCardId={session.selectedRewardCardId}
          onDiscard={(discardInstanceId) => dispatch({ type: "choose-reward-and-discard", cardId: session.selectedRewardCardId!, discardInstanceId })}
          onCancel={() => dispatch({ type: "skip-reward" })}
        />
        {sync.status === "saving" && <aside className="run-sync-banner" role="status">원정 진행 상황을 저장하고 있습니다…</aside>}
      </>;
    }
    return <>
      <RewardScreen reward={run.pendingReward} disabled={sync.status !== "ready" && sync.status !== "saving"} onChoose={(cardId) => {
        if (run.deck.length >= 35) dispatch({ type: "select-reward-for-discard", cardId });
        else dispatch({ type: "choose-reward", cardId });
      }} onSkip={() => dispatch({ type: "skip-reward" })} />
      {leaderboardSubmitNotice}
      {sync.status === "saving" && <aside className="run-sync-banner" role="status">원정 진행 상황을 저장하고 있습니다…</aside>}
    </>;
  }

  if ((run.status === "victory" || run.status === "defeat") && !playbackStep) {
    const victory = run.status === "victory";
    return <main className={`run-screen ${victory ? "outcome-victory" : "outcome-defeat"}`}>
      <section className="run-card outcome-card" role="status">
        <span className="eyebrow">{victory ? "EXPEDITION COMPLETE" : "EXPEDITION ENDED"}</span>
        <h1>{victory ? "어둠의 군주를 물리쳤습니다" : "원정이 끝났습니다"}</h1>
        <p>{victory ? "세 페이즈를 모두 돌파했습니다." : "영웅의 체력이 다했습니다. 고정된 시작 덱으로 다시 도전하세요."}</p>
        <div className="outcome-stats"><span>완료한 전투 <b>{run.completedBattles} / 12</b></span><span>덱 카드 <b>{run.deck.length}장</b></span></div>
        <button className="menu-primary" type="button" disabled={sync.status !== "ready"} onClick={() => { setClassSelectionReason("completed"); setScreen("class-selection"); }}>새 원정 시작</button>
      </section>
      {leaderboardSubmitNotice}
    </main>;
  }

  if (screen === "map" || battle?.status === "playerWon") {
    return <>
      <ExpeditionRoadmap
        run={run}
        disabled={sync.status !== "ready" && sync.status !== "saving"}
        onSelectEncounter={selectRoadmapEncounter}
        onMainMenu={() => setScreen("menu")}
        onLeaderboard={openLeaderboard}
      />
      {leaderboardModal}
      {leaderboardSubmitNotice}
      {sync.status === "saving" && <aside className="run-sync-banner" role="status">원정 진행 상황을 저장하고 있습니다…</aside>}
    </>;
  }

  if (!battle) return <main className="board-unavailable">전투 상태를 불러오지 못했습니다.</main>;

  return (
    <>
      <GameBoard
          run={displayRun ?? run}
          turnTimer={{
            text: `00:${String(turnTimer.remainingSeconds).padStart(2, "0")}`,
            remainingSeconds: turnTimer.remainingSeconds,
            visible: screen === "game" && menuView === "closed" && !turnTimer.isPaused && !session.resolving && !playback && session.combatEffects.length === 0 && battle.activeSide === "player" && battle.status === "active",
          }}
          combatEffects={session.combatEffects}
          combatEffectsPaused={menuView !== "closed"}
          onCombatEffectComplete={(eventId) => dispatch({ type: "clear-combat-effect", eventId })}
          selectedCardInstanceId={session.selectedCardInstanceId}
          selectedAttackerId={session.selectedAttackerId}
          targetMode={session.targetMode}
          isResolving={session.resolving || Boolean(playback)}
          actionsDisabled={sync.status !== "ready" && sync.status !== "saving"}
          error={session.error}
          onSelectCard={selectCard}
          onSelectTarget={selectTarget}
          onDiscardCard={(instanceId) => dispatch({ type: "discard-before-draw", instanceId })}
          onCancelTarget={() => dispatch({ type: session.error ? "clear-error" : "cancel-selection" })}
          onEndTurn={() => dispatch({ type: "end-turn" })}
          onMenu={() => setMenuView("choices")}
          onUseHeroPower={activateHeroPower}
          onAllAttack={() => dispatch({ type: "all-attack" })}
          onDropInteraction={handleDropInteraction}
          enemyIntentStep={playback?.stage === "intent" ? playbackStep ?? null : null}
        />
      {leaderboardSubmitNotice}
      <TurnStartGlow key={turnStartGlowId} turnId={turnStartGlowId} />
      {sync.status === "saving" && <aside className="run-sync-banner" role="status">원정 진행 상황을 저장하고 있습니다…</aside>}
      <AbandonRunDialog open={abandonOpen} busy={sync.status === "saving"} onCancel={() => setAbandonOpen(false)} onConfirm={abandonIntoClassSelection} />
      <AbandonRunDialog intent="main-menu" open={abandonToMenuOpen} busy={abandonToMenuBusy} onCancel={() => setAbandonToMenuOpen(false)} onConfirm={() => { void confirmReturnToMenu(); }} />
      {menuView !== "closed" && <GameMenu
        view={menuView}
        settings={audioSettings}
        onSettingsChange={setAudioSettings}
        onOpenSettings={() => setMenuView("settings")}
        onBackToChoices={() => setMenuView("choices")}
        onMainMenu={() => setAbandonToMenuOpen(true)}
        onReturn={returnToBattle}
      />}
      {session.error && <p className="sr-only" role="alert">{session.error}</p>}
    </>
  );
}
