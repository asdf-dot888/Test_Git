import { CARD_BY_ID, type MinionState } from "@board-game/game-core";
import { describe, expect, it } from "vitest";
import { initialGameSession, reduceGameAction } from "./gameActions.js";

/** A started run with the turn order already picked as first player (a new battle starts pending). */
function startSession(seed = 71) {
  const pending = reduceGameAction(initialGameSession, { type: "start-run", seed, playerClass: "warrior", difficulty: "normal" });
  return reduceGameAction(pending, { type: "choose-turn-order", cardIndex: pending.run!.battle!.turnOrderCards![0] === "first" ? 0 : 1 });
}

function pendingSession(seed = 72) {
  return reduceGameAction(initialGameSession, { type: "start-run", seed, playerClass: "warrior", difficulty: "normal" });
}

function makeMinion(instanceId: string, cardId: string, owner: "player" | "enemy", turn = 0): MinionState {
  const card = CARD_BY_ID.get(cardId)!;
  return { instanceId, cardId, owner, attack: card.minion!.attack, health: card.minion!.maxHealth, maxHealth: card.minion!.maxHealth, summonedTurn: turn, hasAttacked: false };
}

describe("game action adapter", () => {
  it("keeps the current run unchanged when a card costs more mana than available", () => {
    const session = startSession();
    const run = session.run!;
    run.battle!.hand = [{ instanceId: "expensive", cardId: "grave-knight" }];
    run.battle!.playerMana.current = 1;

    const result = reduceGameAction(session, { type: "play-minion", instanceId: "expensive" });

    expect(result.run).toBe(run);
    expect(result.error).toBe("마나가 부족합니다.");
    expect(result.run?.battle?.hand[0]?.instanceId).toBe("expensive");
  });

  it("allows six minions and rejects another on a full lane", () => {
    const session = startSession();
    const battle = session.run!.battle!;
    battle.hand = [{ instanceId: "extra", cardId: "ash-wolf" }];
    battle.playerBoard = Array.from({ length: 6 }, (_, index) => makeMinion(`friendly-${index}`, "bone-rat", "player"));

    const result = reduceGameAction(session, { type: "play-minion", instanceId: "extra" });

    expect(result.run).toBe(session.run);
    expect(result.error).toBe("전장에는 하수인을 6명까지만 둘 수 있습니다.");
  });

  it("requires a valid spell target and applies the effect only after a target is supplied", () => {
    const session = startSession();
    const battle = session.run!.battle!;
    battle.hand = [{ instanceId: "lance", cardId: "soul-lance" }];
    battle.playerMana = { current: 10, max: 10, temporary: 0 };
    battle.enemyBoard = [makeMinion("enemy-unit", "crypt-guard", "enemy")];

    const missingTarget = reduceGameAction(session, { type: "cast-spell", instanceId: "lance" });
    expect(missingTarget.error).toBe("현재 선택할 수 없는 대상입니다.");
    const result = reduceGameAction(session, { type: "cast-spell", instanceId: "lance", targetId: "enemy-unit" });
    expect(result.error).toBeNull();
    expect(result.run?.battle?.enemyBoard).toHaveLength(0);
  });

  it("requires attacking a taunt minion first and only allows one attack per ready minion", () => {
    const session = startSession();
    const battle = session.run!.battle!;
    battle.turnNumber = 3;
    battle.playerBoard = [makeMinion("attacker", "ash-wolf", "player", 1)];
    battle.enemyBoard = [makeMinion("blocker", "warrior-vanguard", "enemy")];

    const blockedHeroAttack = reduceGameAction(session, { type: "attack", attackerId: "attacker", targetId: "enemy" });
    expect(blockedHeroAttack.error).toBe("도발 하수인을 먼저 공격해야 합니다.");

    const firstAttack = reduceGameAction(session, { type: "attack", attackerId: "attacker", targetId: "blocker" });
    expect(firstAttack.run?.battle?.enemyBoard[0]?.health).toBe(battle.enemyBoard[0]!.health - 2); // an Ash Wolf hits for 2
    const secondAttack = reduceGameAction(firstAttack, { type: "attack", attackerId: "attacker", targetId: "blocker" });
    expect(secondAttack.error).toBe("지금은 할 수 없는 행동입니다.");
  });

  it("discards one card and draws one when a full hand blocks the turn draw", () => {
    const session = startSession();
    const battle = session.run!.battle!;
    battle.hand = Array.from({ length: 10 }, (_, index) => ({ instanceId: `hand-${index}`, cardId: "ash-wolf" }));
    battle.pendingDiscardBeforeDraw = true;

    const result = reduceGameAction(session, { type: "discard-before-draw", instanceId: "hand-0" });

    expect(result.pendingDiscard).toBe(false);
    expect(result.run?.battle?.hand).toHaveLength(10);
    expect(result.run?.battle?.discardPile.at(-1)?.instanceId).toBe("hand-0");
  });

  it("skips reward without changing the deck and ends the phase-three boss as a victory", () => {
    const session = startSession();
    const run = session.run!;
    const battle = run.battle!;
    run.phase = 3;
    run.encounterInPhase = 3;
    run.completedBattles = 11;
    run.encounters.forEach((encounter) => { encounter.status = "complete"; });
    run.encounters[11]!.status = "active";
    battle.enemyId = "boss-void-titan";
    battle.enemyHero.health = 1;
    battle.playerBoard = [makeMinion("final-attacker", "ash-wolf", "player", 0)];

    const finalHit = reduceGameAction(session, { type: "attack", attackerId: "final-attacker", targetId: "enemy" });
    expect(finalHit.run?.status).toBe("victory");
    expect(finalHit.run?.pendingReward).not.toBeNull();
    const deckSize = finalHit.run!.deck.length;
    const acknowledged = reduceGameAction(finalHit, { type: "acknowledge-victory" });
    const skipped = reduceGameAction(acknowledged, { type: "skip-reward" });
    expect(skipped.run?.deck).toHaveLength(deckSize);
    expect(skipped.run?.pendingReward).toBeNull();
    expect(skipped.run?.status).toBe("victory");
  });

  it("starts every new battle pending and plays the enemy's opening turn when the second card is picked", () => {
    const pending = pendingSession();
    expect(pending.run?.battle?.firstSide).toBeNull();
    expect(pending.run?.battle?.hand).toHaveLength(0);
    expect(reduceGameAction(pending, { type: "end-turn" }).error).toBe("먼저 선후공을 정하세요.");

    const secondIndex = pending.run!.battle!.turnOrderCards![0] === "second" ? 0 : 1;
    const second = reduceGameAction(pending, { type: "choose-turn-order", cardIndex: secondIndex });
    expect(second.run?.battle?.firstSide).toBe("enemy");
    expect(second.run?.battle?.activeSide).toBe("player");
    expect(second.run?.battle?.hand.some(({ cardId }) => cardId === "the-coin")).toBe(true);
    // The enemy's opening turn is queued as a playback (it may play nothing on 1 mana, then there is nothing to replay).
    expect(second.enemyTurnPlayback === null || second.enemyTurnPlayback.steps.length > 0).toBe(true);

    const firstIndex = secondIndex === 0 ? 1 : 0;
    const first = reduceGameAction(pending, { type: "choose-turn-order", cardIndex: firstIndex });
    expect(first.run?.battle?.firstSide).toBe("player");
    expect(first.run?.battle?.hand).toHaveLength(4);
    expect(first.enemyTurnPlayback).toBeNull();
  });
});
