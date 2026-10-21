import { useState } from "react";
import { CARD_BY_ID } from "@board-game/game-core";
import { GameBoard } from "./components/GameBoard.js";
import { MainMenu } from "./components/MainMenu.js";
import { RewardScreen } from "./components/RewardScreen.js";
import { useGameSession } from "./game/useGameSession.js";

export function App() {
  const { session, dispatch, startNewRun } = useGameSession();
  const [screen, setScreen] = useState<"menu" | "game">("menu");
  const run = session.run;
  const battle = run?.battle;

  const beginRun = () => {
    startNewRun();
    setScreen("game");
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
    if (session.targetMode === "spell" && session.selectedCardInstanceId) {
      dispatch({ type: "cast-spell", instanceId: session.selectedCardInstanceId, targetId });
      return;
    }
    const friendlyMinion = battle.playerBoard.find((minion) => minion.instanceId === targetId);
    if (friendlyMinion) {
      dispatch({ type: "select-attacker", instanceId: friendlyMinion.instanceId });
      return;
    }
    if (session.selectedAttackerId) dispatch({ type: "attack", attackerId: session.selectedAttackerId, targetId });
  };

  if (screen === "menu" || !run) {
    return <MainMenu canContinue={run?.status === "active"} onStart={beginRun} onContinue={() => setScreen("game")} />;
  }

  if (run.pendingReward) {
    return <RewardScreen reward={run.pendingReward} onChoose={(cardId) => dispatch({ type: "choose-reward", cardId })} onSkip={() => dispatch({ type: "skip-reward" })} />;
  }

  if (run.status === "victory" || run.status === "defeat") {
    const victory = run.status === "victory";
    return <main className={`run-screen ${victory ? "outcome-victory" : "outcome-defeat"}`}>
      <section className="run-card outcome-card" role="status">
        <span className="eyebrow">{victory ? "EXPEDITION COMPLETE" : "EXPEDITION ENDED"}</span>
        <h1>{victory ? "어둠의 군주를 물리쳤습니다" : "원정이 끝났습니다"}</h1>
        <p>{victory ? "세 페이즈를 모두 돌파했습니다." : "영웅의 체력이 다했습니다. 고정된 시작 덱으로 다시 도전하세요."}</p>
        <div className="outcome-stats"><span>완료한 전투 <b>{run.completedBattles} / 12</b></span><span>덱 카드 <b>{run.deck.length}장</b></span></div>
        <button className="menu-primary" type="button" onClick={beginRun}>새 원정 시작</button>
      </section>
    </main>;
  }

  if (battle?.status === "playerWon") {
    return <main className="run-screen"><section className="run-card outcome-card" role="status">
      <span className="eyebrow">BATTLE CLEARED</span><h1>전투에서 승리했습니다</h1>
      <p>영웅의 체력과 마나가 다음 전투를 위해 회복됩니다.</p>
      <div className="outcome-stats"><span>진행 <b>PHASE {run.phase} · {run.completedBattles} / 12</b></span><span>현재 덱 <b>{run.deck.length}장</b></span></div>
      <button className="menu-primary" type="button" onClick={() => dispatch({ type: "continue-run" })}>다음 전투</button>
    </section></main>;
  }

  if (!battle) return <main className="board-unavailable">전투 상태를 불러오지 못했습니다.</main>;

  return (
    <>
      <GameBoard
          run={run}
          selectedCardInstanceId={session.selectedCardInstanceId}
          selectedAttackerId={session.selectedAttackerId}
          targetMode={session.targetMode}
          isResolving={session.resolving}
          error={session.error}
          onSelectCard={selectCard}
          onSelectTarget={selectTarget}
          onDiscardCard={(instanceId) => dispatch({ type: "discard-before-draw", instanceId })}
          onCancelTarget={() => dispatch({ type: session.error ? "clear-error" : "cancel-selection" })}
          onEndTurn={() => dispatch({ type: "end-turn" })}
          onMenu={() => setScreen("menu")}
        />
      {session.error && <p className="sr-only" role="alert">{session.error}</p>}
    </>
  );
}
