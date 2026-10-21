import { useState } from "react";
import { CARD_BY_ID, createRun, type MinionState } from "@board-game/game-core";
import { GameBoard } from "./components/GameBoard.js";

function createPreviewRun() {
  const run = createRun(20261021);
  const battle = run.battle;
  if (!battle) return run;
  const makeMinion = (instanceId: string, cardId: string, owner: "player" | "enemy", health: number): MinionState => {
    const definition = CARD_BY_ID.get(cardId)!;
    const minion = definition.minion!;
    return { instanceId, cardId, owner, attack: minion.attack, health, maxHealth: minion.maxHealth, summonedTurn: 0, hasAttacked: false };
  };
  battle.enemyBoard = [makeMinion("enemy-unit-1", "crypt-guard", "enemy", 2), makeMinion("enemy-unit-2", "ash-wolf", "enemy", 1)];
  battle.playerBoard = [makeMinion("player-unit-1", "grave-knight", "player", 3), makeMinion("player-unit-2", "cinder-imp", "player", 2), makeMinion("player-unit-3", "iron-hound", "player", 4)];
  battle.playerMana = { current: 5, max: 5 };
  return run;
}

export function App() {
  const [run] = useState(createPreviewRun);
  const [selectedCardInstanceId, setSelectedCardInstanceId] = useState<string | null>(null);
  const [selectedAttackerId, setSelectedAttackerId] = useState<string | null>(null);
  const [targetMode, setTargetMode] = useState<"none" | "spell" | "attack">("none");
  const [notice, setNotice] = useState("카드를 선택해 전투 준비를 시작하세요.");

  const selectCard = (instanceId: string) => {
    setSelectedCardInstanceId((current) => current === instanceId ? null : instanceId);
    const card = run.battle?.hand.find((item) => item.instanceId === instanceId);
    const definition = card ? CARD_BY_ID.get(card.cardId) : undefined;
    if (definition?.kind === "spell") setTargetMode("spell");
    else setTargetMode("none");
    setNotice(definition ? `${definition.name} 카드가 선택되었습니다.` : "카드가 선택되었습니다.");
  };

  const selectTarget = (targetId: string) => {
    if (targetMode === "attack") setSelectedAttackerId(targetId);
    setNotice("대상이 선택되었습니다.");
  };

  const endTurn = () => {
    setSelectedCardInstanceId(null);
    setSelectedAttackerId(null);
    setTargetMode("none");
    setNotice("턴 종료는 전투 연결 단계에서 처리됩니다.");
  };

  return (
    <>
      <GameBoard
        run={run}
        selectedCardInstanceId={selectedCardInstanceId}
        selectedAttackerId={selectedAttackerId}
        targetMode={targetMode}
        onSelectCard={selectCard}
        onSelectTarget={selectTarget}
        onEndTurn={endTurn}
      />
      <p className="sr-only" role="status">{notice}</p>
    </>
  );
}
