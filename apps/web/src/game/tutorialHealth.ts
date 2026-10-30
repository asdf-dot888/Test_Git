import type { RunState } from "@board-game/game-core";

export function restoreTutorialPlayerHealth(run: RunState): RunState {
  const restored = structuredClone(run);
  if (!restored.battle) return restored;
  restored.battle.playerHero.health = restored.battle.playerHero.maxHealth;
  for (const minion of restored.battle.playerBoard) minion.health = minion.maxHealth;
  return restored;
}
