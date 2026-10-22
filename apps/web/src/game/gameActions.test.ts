import { describe, expect, it } from "vitest";
import { createRun } from "@board-game/game-core";
import { initialGameSession, reduceGameAction } from "./gameActions.js";

describe("reduceGameAction timer snapshots", () => {
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
});
