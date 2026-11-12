import type { CardDefinition } from "@board-game/game-core";

export type PlayerSpellSelection = "enemy-minion" | "enemy-character" | "friendly-minion" | null;

export function getPlayerSpellSelection(card: CardDefinition | undefined): PlayerSpellSelection {
  if (card?.kind !== "spell") return null;
  for (const effect of card.spellEffects ?? []) {
    if (effect.kind === "damage" && effect.target === "enemyMinion") return "enemy-minion";
    if (effect.kind === "randomDamage") return "enemy-character";
    if (effect.kind === "cleave") return "enemy-minion";
    if ((effect.kind === "heal" && effect.target === "playerMinion") || effect.kind === "buff") return "friendly-minion";
  }
  return null;
}
