import { describe, expect, it } from "vitest";
import { createRun } from "@board-game/game-core";
import { initialGameSession, reduceGameAction } from "./gameActions.js";

describe("reduceGameAction timer snapshots", () => {
  it("keeps redraw available through selection and consumes it after the redraw or first action", () => {
    let session = reduceGameAction(initialGameSession, { type: "restore-run", run: createRun(543) });
    const openingHand = session.run!.battle!.hand;
    session = reduceGameAction(session, { type: "select-card", instanceId: openingHand[0]!.instanceId });
    expect(session.run?.openingHandRedrawAvailable).toBe(true);

    session = reduceGameAction(session, { type: "redraw-opening-hand" });
    expect(session.run?.openingHandRedrawAvailable).toBe(false);
    expect(session.run?.battle?.hand).toHaveLength(3);

    const actionRun = createRun(544);
    const afterTurn = reduceGameAction(reduceGameAction(initialGameSession, { type: "restore-run", run: actionRun }), { type: "end-turn" });
    expect(afterTurn.run?.openingHandRedrawAvailable).toBe(false);
  });

  it("updates and clears only the run timer without creating combat events", () => {
    const run = createRun(540);
    const session = reduceGameAction(initialGameSession, { type: "restore-run", run });
    const timer = { battleId: run.battle!.battleId, turnNumber: run.battle!.turnNumber, deadlineAt: 12_345, pausedRemainingMs: null };
    const updated = reduceGameAction(session, { type: "set-turn-timer", timer });

    expect(updated.run?.turnTimer).toEqual(timer);
    expect(updated.run?.battle).toBe(session.run?.battle);
    expect(updated.combatEffects).toEqual([]);

    const cleared = reduceGameAction(updated, { type: "set-turn-timer", timer: undefined });
    expect(cleared.run).not.toHaveProperty("turnTimer");
    expect(cleared.combatEffects).toEqual([]);
  });

  it("starts with a one-second enemy intent before applying its visual event", () => {
    const run = createRun(541);
    run.battle!.enemyHand = [{ instanceId: "enemy-minion", cardId: "ash-wolf" }];
    run.battle!.enemyDrawPile = [{ instanceId: "enemy-draw", cardId: "eclipse" }];
    const session = reduceGameAction(initialGameSession, { type: "restore-run", run });
    const afterTurn = reduceGameAction(session, { type: "end-turn" });

    expect(afterTurn.combatEffects).toEqual([]);
    expect(afterTurn.run?.battle).not.toHaveProperty("enemyTurnEvents");
    expect(afterTurn.enemyTurnPlayback?.currentIndex).toBe(0);
    expect(afterTurn.enemyTurnPlayback?.stage).toBe("intent");
    expect(afterTurn.run?.battle?.activeSide).toBe("player");
    expect(afterTurn.enemyTurnPlayback?.steps[0]?.presentationRun.battle?.activeSide).toBe("enemy");
    const effect = reduceGameAction(afterTurn, { type: "advance-enemy-turn-playback" });
    expect(effect.enemyTurnPlayback?.stage).toBe("effect");
    expect(effect.combatEffects.some((event) => event.source.kind === "hand" && event.source.side === "enemy")).toBe(true);
  });

  it("advances one action group at a time and clears playback after the final group", () => {
    const run = createRun(542);
    run.battle!.enemyHand = [{ instanceId: "enemy-minion", cardId: "ash-wolf" }];
    run.battle!.enemyDrawPile = [{ instanceId: "enemy-draw", cardId: "eclipse" }];
    run.battle!.enemyBoard = [{ instanceId: "enemy-ready", cardId: "bone-rat", owner: "enemy", attack: 1, health: 3, maxHealth: 3, summonedTurn: 0, hasAttacked: false }];
    run.battle!.playerBoard = [{ instanceId: "player-target", cardId: "ash-wolf", owner: "player", attack: 1, health: 5, maxHealth: 5, summonedTurn: 0, hasAttacked: false }];
    let session = reduceGameAction(initialGameSession, { type: "restore-run", run });
    session = reduceGameAction(session, { type: "end-turn" });

    expect(session.enemyTurnPlayback?.steps).toHaveLength(2);
    expect(session.combatEffects).toHaveLength(0);
    expect(session.enemyTurnPlayback?.currentIndex).toBe(0);
    expect(session.run?.battle?.enemyTurnEvents).toBeUndefined();
    expect(session.run?.battle?.playerBoard[0]?.health).toBe(4);
    expect(session.enemyTurnPlayback?.steps[0]?.presentationRun.battle?.playerBoard[0]?.health).toBe(5);

    session = reduceGameAction(session, { type: "advance-enemy-turn-playback" });
    expect(session.enemyTurnPlayback?.stage).toBe("effect");
    expect(session.combatEffects).toHaveLength(1);
    session = reduceGameAction(session, { type: "clear-combat-effect", eventId: session.combatEffects[0]!.id });
    session = reduceGameAction(session, { type: "advance-enemy-turn-playback" });
    expect(session.enemyTurnPlayback?.currentIndex).toBe(1);
    expect(session.enemyTurnPlayback?.stage).toBe("intent");
    expect(session.combatEffects).toEqual([]);

    session = reduceGameAction(session, { type: "advance-enemy-turn-playback" });
    expect(session.enemyTurnPlayback?.stage).toBe("effect");
    expect(session.combatEffects[0]?.id).toBeGreaterThan(1);
    session = reduceGameAction(session, { type: "clear-combat-effect", eventId: session.combatEffects[0]!.id });
    session = reduceGameAction(session, { type: "advance-enemy-turn-playback" });
    expect(session.enemyTurnPlayback).toBeNull();
    expect(session.combatEffects).toEqual([]);
    expect(session.run?.battle?.activeSide).toBe("player");
  });
});
