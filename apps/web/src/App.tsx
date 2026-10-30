import { useCallback, useEffect, useRef, useState } from "react";
import { CARD_BY_ID, ENEMY_BY_ID, type PlayerClass } from "@board-game/game-core";
import { AbandonRunDialog } from "./components/AbandonRunDialog.js";
import { VictoryScreen } from "./components/VictoryScreen.js";
import { EnemyHeroDefeatEffect } from "./components/EnemyHeroDefeatEffect.js";
import { GameBoard } from "./components/GameBoard.js";
import { FirstRunTutorial, type TutorialAction, type TutorialStepId } from "./components/FirstRunTutorial.js";
import { ExpeditionRoadmap } from "./components/ExpeditionRoadmap.js";
import { MainMenu } from "./components/MainMenu.js";
import { ClassSelectionScreen } from "./components/ClassSelectionScreen.js";
import type { DragPayload, DropTarget } from "./components/dragInteractions.js";
import { RewardScreen } from "./components/RewardScreen.js";
import { DeckLimitDialog } from "./components/DeckLimitDialog.js";
import { DiscardPicker } from "./components/DiscardPicker.js";
import { GameMenu } from "./components/GameMenu.js";
import { AudioSettingsModal } from "./components/AudioSettingsModal.js";
import { TurnStartGlow } from "./components/TurnStartGlow.js";
import { LeaderboardModal, type LeaderboardLoadState } from "./components/LeaderboardModal.js";
import { useGameSession } from "./game/useGameSession.js";
import { useLocalRun, type LocalRunController } from "./game/useLocalRun.js";
import { useTurnTimer } from "./game/useTurnTimer.js";
import { useEnemyTurnPlayback } from "./game/useEnemyTurnPlayback.js";
import { createAudioController, type AudioController, type AudioSettings, type MusicKind } from "./game/audio.js";
import type { GameAction } from "./game/gameActions.js";
import { loadAudioSettings, saveAudioSettings } from "./game/audioSettings.js";
import { getTopTen, LeaderboardApiError, submitProgress, type LeaderboardRecord } from "./leaderboard/leaderboardClient.js";
import { combatEventSounds } from "./game/combatEffects.js";
import { useAuth } from "./auth/useAuth.js";
import { loadTutorialProgress, markTutorialCompleted } from "./game/tutorialProgress.js";
import { createRun as createGameRun, type RunState } from "@board-game/game-core";

const INTERACTIVE_AUDIO_SELECTOR = "button, a[href], input, select, textarea, label[for], [role='button'], [role='option'], [data-pointer-interaction]";

function closestInteractive(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>(INTERACTIVE_AUDIO_SELECTOR) : null;
}

function isAudioDisabled(control: HTMLElement): boolean {
  let current: HTMLElement | null = control;
  while (current) {
    if (current.matches(":disabled") || current.getAttribute("aria-disabled") === "true") return true;
    current = current.parentElement;
  }
  return false;
}

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
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false);
  const [audioController, setAudioController] = useState<AudioController | null>(null);
  const [autoplayHintVisible, setAutoplayHintVisible] = useState(false);
  const [tutorialMode, setTutorialMode] = useState<"inactive" | "first-run" | "replay">("inactive");
  const [tutorialStep, setTutorialStep] = useState<TutorialStepId>("inspect-hand");
  const [tutorialNotice, setTutorialNotice] = useState<string | null>(null);
  const tutorialCheckedKey = useRef<string | null>(null);
  const tutorialReplaySnapshot = useRef<{ run: RunState | null; screen: "menu" | "class-selection" | "map" | "game" } | null>(null);
  const tutorialActionRef = useRef<{ action: TutorialAction | "attack-retry" | "first-turn-end" | "second-turn-end" | "play-card-recovery"; turn: number; handCount: number; boardIds: string[]; attackerId?: string } | null>(null);
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
  const victoryPresentationActive = Boolean(run?.pendingVictoryAcknowledgement && (session.victoryPresentation || session.combatEffects.some((event) => event.slowMotion)));
  const hasBattlePresentation = screen === "game" && Boolean(battle && (battle.status === "active" || victoryPresentationActive));
  const musicKind: MusicKind = hasBattlePresentation ? (enemyKind === "boss" ? "boss" : "normal") : "menu";
  const tutorialAttackUnavailable = Boolean(tutorialMode !== "inactive" && battle
    && !battle.playerBoard.some((minion) => minion.summonedTurn < battle.turnNumber && !minion.hasAttacked));
  const activeTurnId = screen === "game" && !playback && run?.battle?.activeSide === "player" && run.battle.status === "active"
    ? `${run.battle.battleId}:${run.battle.turnNumber}`
    : null;
  const dispatch = useCallback((action: GameAction) => {
    if (action.type === "end-turn" || action.type === "finish-all-attack") audioController?.playEffect("turn-end");
    dispatchGameAction(action);
  }, [audioController, dispatchGameAction]);
  const finishTutorial = () => {
    tutorialActionRef.current = null;
    if (tutorialMode === "first-run" && auth.userId) {
      let result;
      try {
        result = markTutorialCompleted(window.localStorage, auth.userId);
      } catch (error) {
        result = { status: "error" as const, error };
      }
      if (result.status === "error") setTutorialNotice("튜토리얼 완료를 저장하지 못했지만 전투는 계속할 수 있습니다.");
    }
    if (tutorialMode === "replay") {
      const snapshot = tutorialReplaySnapshot.current;
      tutorialReplaySnapshot.current = null;
      if (snapshot?.run) dispatchGameAction({ type: "restore-run", run: snapshot.run });
      else dispatchGameAction({ type: "clear-run" });
      setScreen(snapshot?.screen ?? "menu");
    }
    setTutorialMode("inactive");
  };
  const turnTimer = useTurnTimer({
    run: run ?? null,
    paused: screen !== "game" || menuView !== "closed" || Boolean(run?.pendingVictoryAcknowledgement) || session.resolving || Boolean(playback) || session.combatEffects.length > 0,
    onTimerChange: (timer) => dispatch({ type: "set-turn-timer", timer }),
    onTimeout: () => dispatch({ type: "end-turn" }),
  });

  useEffect(() => {
    const currentBattle = run?.battle;
    if (!session.autoEndTurnAfterAllAttack || session.combatEffects.length > 0 || session.resolving || playback
      || screen !== "game" || menuView !== "closed" || !currentBattle || currentBattle.status !== "active"
      || currentBattle.activeSide !== "player" || currentBattle.enemyHero.health <= 0) return;
    dispatch({ type: "finish-all-attack" });
  }, [dispatch, menuView, playback, run, screen, session.autoEndTurnAfterAllAttack, session.combatEffects.length, session.resolving]);

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
    if (!audioController || !auth.isAuthenticated || !syncLoaded) return;
    let active = true;
    void audioController.playMusic(musicKind).then((started) => {
      if (!active) return;
      const shouldShowHint = musicKind === "menu"
        && !started
        && !audioSettings.muted
        && audioSettings.musicVolume > 0;
      setAutoplayHintVisible(shouldShowHint);
    });
    return () => { active = false; };
  }, [audioController, audioSettings.muted, audioSettings.musicVolume, auth.isAuthenticated, musicKind, syncLoaded]);

  useEffect(() => {
    if (!audioController) return;
    for (const event of session.combatEffects) {
      if (playedAudioEventIds.current.has(event.id)) continue;
      playedAudioEventIds.current.add(event.id);
      for (const cue of combatEventSounds(event)) audioController.playEffect(cue);
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
    const onPointerDown = () => {
      void audioController.unlock().then((started) => {
        if (started) setAutoplayHintVisible(false);
      });
    };
    const onClick = (event: MouseEvent) => {
      const control = closestInteractive(event.target);
      if (!control || isAudioDisabled(control)) return;
      audioController.playEffect("ui-click");
    };
    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const control = closestInteractive(event.target);
      if (!control || isAudioDisabled(control)) return;
      const previousControl = closestInteractive(event.relatedTarget);
      if (previousControl === control) return;
      audioController.playEffect("ui-hover");
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("pointerover", onPointerOver, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("pointerover", onPointerOver, true);
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
    if (tutorialMode === "replay" || !syncLoaded || (syncStatus !== "ready" && syncStatus !== "saving") || !session.run || session.run === syncedRun) return;
    void saveRun(session.run).catch(() => undefined);
  }, [saveRun, session.run, syncLoaded, syncStatus, syncedRun, tutorialMode]);

  useEffect(() => {
    if (tutorialMode !== "inactive" || screen !== "game" || !run?.battle || run.completedBattles !== 0 || !auth.userId) return;
    const key = `${auth.userId}:${run.runId}:${run.battle.battleId}`;
    if (tutorialCheckedKey.current === key) return;
    tutorialCheckedKey.current = key;
    let result;
    try {
      result = loadTutorialProgress(window.localStorage, auth.userId);
    } catch (error) {
      result = { status: "error" as const, error };
    }
    if (result.status !== "completed") {
      setTutorialStep("inspect-hand");
      setTutorialMode("first-run");
    }
  }, [auth.userId, run, screen, tutorialMode]);

  useEffect(() => {
    const pending = tutorialActionRef.current;
    const currentBattle = session.run?.battle;
    if (!pending || !currentBattle) return;
    if (pending.action === "play-card") {
      if (currentBattle.hand.length < pending.handCount || currentBattle.playerBoard.length > pending.boardIds.length) {
        tutorialActionRef.current = null;
        setTutorialStep("end-first-turn");
      }
      return;
    }
    if (pending.action === "play-card-recovery") {
      if (currentBattle.hand.length < pending.handCount || currentBattle.playerBoard.length > pending.boardIds.length) {
        tutorialActionRef.current = null;
        setTutorialStep("attack");
      }
      return;
    }
    if (pending.action === "attack") {
      const remaining = currentBattle.playerBoard.find((minion) => minion.instanceId === pending.attackerId);
      if (!remaining || remaining.hasAttacked) {
        tutorialActionRef.current = null;
        setTutorialStep("end-second-turn");
      }
      return;
    }
    if (currentBattle.turnNumber <= pending.turn || currentBattle.activeSide !== "player") return;
    tutorialActionRef.current = null;
    if (pending.action === "second-turn-end") {
      finishTutorial();
    } else if (pending.action === "first-turn-end" || pending.action === "attack-retry") {
      setTutorialStep("attack");
    }
  // finishTutorial is intentionally kept stable through refs below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.run]);

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

  const replayTutorial = () => {
    if (!syncLoaded) return;
    tutorialReplaySnapshot.current = { run: session.run ? structuredClone(session.run) : null, screen };
    const playerClass = session.run?.playerClass ?? "warrior";
    const sandbox = createGameRun(20261030, playerClass);
    dispatchGameAction({ type: "restore-run", run: sandbox });
    tutorialActionRef.current = null;
    setTutorialStep("inspect-hand");
    setTutorialNotice(null);
    setTutorialMode("replay");
    setScreen("game");
  };

  const tutorialAllows = (action: TutorialAction) => tutorialMode === "inactive"
    || (tutorialStep === "inspect-hand" && action === "continue")
    || (tutorialStep === "play-card" && action === "play-card")
    || (tutorialStep === "end-first-turn" && action === "end-turn")
    || (tutorialStep === "attack" && (action === "attack" || (tutorialAttackUnavailable && (action === "play-card" || action === "end-turn"))))
    || (tutorialStep === "end-second-turn" && action === "end-turn");

  const advanceTutorial = (action: TutorialAction) => {
    if (!tutorialAllows(action)) return;
    if (action === "continue") {
      setTutorialStep("play-card");
      return;
    }
    if (!battle) return;
    tutorialActionRef.current = {
      action: action === "end-turn"
        ? tutorialStep === "end-first-turn" ? "first-turn-end" : tutorialStep === "end-second-turn" ? "second-turn-end" : "attack-retry"
        : action === "play-card" && tutorialStep === "attack" ? "play-card-recovery" : action,
      turn: battle.turnNumber,
      handCount: battle.hand.length,
      boardIds: battle.playerBoard.map((minion) => minion.instanceId),
    };
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
    if (tutorialMode !== "inactive" && !tutorialAllows("play-card")) return;
    const cardInstance = battle?.hand.find((card) => card.instanceId === instanceId);
    const card = cardInstance ? CARD_BY_ID.get(cardInstance.cardId) : undefined;
    if (!card || !battle) return;
    if (tutorialMode !== "inactive") advanceTutorial("play-card");
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
    if (tutorialMode !== "inactive" && !((tutorialStep === "attack" && (session.targetMode === "none" || session.targetMode === "attack"))
      || (tutorialStep === "play-card" && session.targetMode === "spell"))) return;
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
    if (session.selectedAttackerId) {
      if (tutorialMode !== "inactive") {
        const attacker = battle.playerBoard.find((minion) => minion.instanceId === session.selectedAttackerId);
        if (!attacker || attacker.summonedTurn >= battle.turnNumber || attacker.hasAttacked) return;
        advanceTutorial("attack");
        const pending = tutorialActionRef.current;
        if (pending) tutorialActionRef.current = { ...pending, attackerId: attacker.instanceId };
      }
      dispatch({ type: "attack", attackerId: session.selectedAttackerId, targetId });
    }
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
      if (tutorialMode !== "inactive" && !tutorialAllows("play-card")) return;
      const card = battle.hand.find(({ instanceId }) => instanceId === payload.instanceId);
      const definition = card ? CARD_BY_ID.get(card.cardId) : undefined;
      if (!card || !definition) return;
      if (target.kind === "slot" && definition.kind === "minion") {
        if (tutorialMode !== "inactive") advanceTutorial("play-card");
        dispatch({ type: "play-minion", instanceId: payload.instanceId, slotIndex: target.slotIndex });
        return;
      }
      if (definition.kind === "spell" && target.kind === "minion") {
        if (tutorialMode !== "inactive") advanceTutorial("play-card");
        dispatch({ type: "cast-spell", instanceId: payload.instanceId, targetId: target.instanceId });
        return;
      }
      if (definition.kind === "spell" && target.kind === "hero" && target.side === "enemy") {
        if (tutorialMode !== "inactive") advanceTutorial("play-card");
        const targetId = definition.spellEffects?.some((effect) => effect.kind === "randomDamage") ? "enemy-hero" : battle.enemyHero.id;
        dispatch({ type: "cast-spell", instanceId: payload.instanceId, targetId });
      }
      return;
    }

    const attacker = battle.playerBoard.find(({ instanceId }) => instanceId === payload.instanceId);
    if (!attacker) return;
    if (tutorialMode !== "inactive" && tutorialStep !== "attack") return;
    const canAttack = attacker.summonedTurn < battle.turnNumber && !attacker.hasAttacked;
    if (target.kind === "minion" && target.side === "enemy") {
      if (!canAttack) return;
      if (tutorialMode !== "inactive") {
        advanceTutorial("attack");
        const pending = tutorialActionRef.current;
        if (pending) tutorialActionRef.current = { ...pending, attackerId: attacker.instanceId };
      }
      dispatch({ type: "attack", attackerId: attacker.instanceId, targetId: target.instanceId });
    } else if (target.kind === "hero" && target.side === "enemy") {
      if (!canAttack || battle.enemyBoard.length > 0) return;
      if (tutorialMode !== "inactive") {
        advanceTutorial("attack");
        const pending = tutorialActionRef.current;
        if (pending) tutorialActionRef.current = { ...pending, attackerId: attacker.instanceId };
      }
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
  const audioSettingsModal = audioSettingsOpen ? <AudioSettingsModal settings={audioSettings} onSettingsChange={setAudioSettings} onClose={() => setAudioSettingsOpen(false)} /> : null;
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
      <MainMenu canContinue={run?.status === "active" || Boolean(run?.pendingVictoryAcknowledgement || run?.pendingReward)} disabled={sync.status !== "ready" || Boolean(sync.run && !run)} showAutoplayHint={autoplayHintVisible} onStart={beginRun} onContinue={() => setScreen(run?.pendingVictoryAcknowledgement || run?.pendingReward ? "game" : "map")} onLeaderboard={openLeaderboard} onAudioSettings={() => setAudioSettingsOpen(true)} onReplayTutorial={replayTutorial} />
      {audioSettingsModal}
      {leaderboardModal}
      {leaderboardSubmitNotice}
      {sync.status === "saving" && <aside className="run-sync-banner" role="status">원정 진행 상황을 저장하고 있습니다…</aside>}
      <AbandonRunDialog open={abandonOpen} busy={sync.status === "saving"} onCancel={() => setAbandonOpen(false)} onConfirm={abandonIntoClassSelection} />
    </>;
  }

  if (run.pendingVictoryAcknowledgement && !victoryPresentationActive) {
    return <>
      <VictoryScreen disabled={sync.status !== "ready" && sync.status !== "saving"} onConfirm={acknowledgeVictory} />
      {leaderboardSubmitNotice}
      {sync.status === "saving" && <aside className="run-sync-banner" role="status">원정 진행 상황을 저장하고 있습니다…</aside>}
    </>;
  }

  if (run.pendingVictoryAcknowledgement && !battle && session.victoryPresentation === "victory-reveal") {
    return <VictoryScreen overlay disabled={sync.status !== "ready" && sync.status !== "saving"} onConfirm={acknowledgeVictory} />;
  }

  if (!victoryPresentationActive && run.pendingReward && rewardLimitKey && deckLimitPromptedKey !== rewardLimitKey) {
    return <DeckLimitDialog
      disabled={sync.status !== "ready" && sync.status !== "saving"}
      onConfirm={() => setDeckLimitPromptedKey(rewardLimitKey)}
      onClose={() => dispatch({ type: "skip-reward" })}
    />;
  }

  if (!victoryPresentationActive && run.pendingReward) {
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

  if (!victoryPresentationActive && (run.status === "victory" || run.status === "defeat") && !playbackStep) {
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

  if (!victoryPresentationActive && (screen === "map" || battle?.status === "playerWon")) {
    return <>
      <ExpeditionRoadmap
        run={run}
        disabled={sync.status !== "ready" && sync.status !== "saving"}
        onSelectEncounter={selectRoadmapEncounter}
        onMainMenu={() => setScreen("menu")}
        onLeaderboard={openLeaderboard}
        onAudioSettings={() => setAudioSettingsOpen(true)}
        showAutoplayHint={autoplayHintVisible}
      />
      {audioSettingsModal}
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
          actionsDisabled={(sync.status !== "ready" && sync.status !== "saving") || Boolean(run.pendingVictoryAcknowledgement)}
          {...(tutorialMode !== "inactive" ? { tutorialStep } : {})}
          error={session.error}
          onSelectCard={selectCard}
          onSelectTarget={selectTarget}
          onDiscardCard={(instanceId) => { if (tutorialMode === "inactive") dispatch({ type: "discard-before-draw", instanceId }); }}
          onCancelTarget={() => dispatch({ type: session.error ? "clear-error" : "cancel-selection" })}
          onEndTurn={() => { if (tutorialMode === "inactive" || tutorialAllows("end-turn")) { if (tutorialMode !== "inactive") advanceTutorial("end-turn"); dispatch({ type: "end-turn" }); } }}
          onRedrawOpeningHand={() => { if (tutorialMode === "inactive") dispatch({ type: "redraw-opening-hand" }); }}
          onMenu={() => { if (tutorialMode === "inactive") setMenuView("choices"); }}
          onUseHeroPower={() => { if (tutorialMode === "inactive") activateHeroPower(); }}
          onAllAttack={() => { if (tutorialMode === "inactive") dispatch({ type: "all-attack" }); }}
          onDropInteraction={handleDropInteraction}
          enemyIntentStep={playback?.stage === "intent" ? playbackStep ?? null : null}
        />
      {tutorialMode !== "inactive" && screen === "game" && <FirstRunTutorial
        step={tutorialStep}
        attackUnavailable={tutorialStep === "attack" && tutorialAttackUnavailable}
        onAction={advanceTutorial}
        onSkip={finishTutorial}
      />}
      {tutorialNotice && <aside className="first-run-tutorial-notice" role="status">{tutorialNotice}<button type="button" onClick={() => setTutorialNotice(null)}>닫기</button></aside>}
      {session.victoryPresentation === "enemy-defeat" && <EnemyHeroDefeatEffect onComplete={() => dispatchGameAction({ type: "enemy-defeat-effect-complete" })} />}
      {session.victoryPresentation === "victory-reveal" && <VictoryScreen overlay disabled={sync.status !== "ready" && sync.status !== "saving"} onConfirm={acknowledgeVictory} />}
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
