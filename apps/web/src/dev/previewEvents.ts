import { CARD_BY_ID, PLAYER_CLASS_DEFINITIONS, type PlayerClass, type PlayerSide } from "@board-game/game-core";
import { combatKindForSpellEffect, type CombatAnchor, type CombatEffectEvent, type CombatEffectKind } from "../game/combatEffects.js";

/** Helpers for the development-only effects gallery. */

export type TargetChoice = "enemy-hero" | "enemy-minion" | "player-minion" | "player-hero";

export const PREVIEW_TARGETS: ReadonlyArray<{ value: TargetChoice; label: string; anchor: CombatAnchor }> = [
  { value: "enemy-hero", label: "적 영웅", anchor: { kind: "hero", side: "enemy" } },
  { value: "enemy-minion", label: "적 하수인", anchor: { kind: "minion", side: "enemy", slot: 1 } },
  { value: "player-minion", label: "내 하수인", anchor: { kind: "minion", side: "player", slot: 1 } },
  { value: "player-hero", label: "내 영웅", anchor: { kind: "hero", side: "player" } },
];

export const PREVIEW_GROUPS = ["영웅 능력", "직업 주문", "공용 주문", "보스 주문"] as const;

const HERO_POWER_PREFIX = "hero-power-";

export function previewLabel(id: string): string {
  if (id.startsWith(HERO_POWER_PREFIX)) {
    const playerClass = id.slice(HERO_POWER_PREFIX.length) as PlayerClass;
    const definition = PLAYER_CLASS_DEFINITIONS.find(({ id: classId }) => classId === playerClass);
    return `영웅 능력: ${definition?.heroPowerName ?? id}`;
  }
  return CARD_BY_ID.get(id)?.name ?? id;
}

export function previewGroup(id: string): (typeof PREVIEW_GROUPS)[number] {
  if (id.startsWith(HERO_POWER_PREFIX)) return "영웅 능력";
  const card = CARD_BY_ID.get(id);
  if (card?.enemyOnly) return "보스 주문";
  if (card?.classId) return "직업 주문";
  return "공용 주문";
}

function previewKind(id: string): { effectKind: CombatEffectKind; spellEffectKind?: NonNullable<CombatEffectEvent["spellEffectKind"]> } {
  if (id.startsWith(HERO_POWER_PREFIX)) return { effectKind: "hero-power" };
  const effect = CARD_BY_ID.get(id)?.spellEffects?.[0];
  return effect ? { effectKind: combatKindForSpellEffect(effect), spellEffectKind: effect.kind } : { effectKind: "damage" };
}

/** Builds a synthetic primary event for the gallery, optionally with a hit result so consequences can be reviewed. */
export function buildPreviewEvent(options: {
  id: string;
  eventId: number;
  caster: PlayerSide;
  target: TargetChoice;
  damage: number;
  slowMotion: boolean;
}): CombatEffectEvent {
  const { id, eventId, caster, target, damage, slowMotion } = options;
  const targetAnchor = PREVIEW_TARGETS.find(({ value }) => value === target)!.anchor;
  const isHeroPower = id.startsWith(HERO_POWER_PREFIX);
  const source: CombatAnchor = isHeroPower ? { kind: "hero", side: caster } : { kind: "hand", side: caster, slot: 0 };
  const { effectKind, spellEffectKind } = previewKind(id);
  const damageTarget = targetAnchor.kind === "hero" || targetAnchor.kind === "minion" ? targetAnchor.kind : undefined;
  const showHit = damage > 0 && damageTarget !== undefined;
  return {
    id: eventId,
    assetCardId: isHeroPower ? null : id,
    effectKind,
    soundCues: effectKind === "summon" ? ["summon"] : showHit ? ["spell", "damage"] : ["spell"],
    source,
    target: targetAnchor,
    visualId: id,
    visualRole: "primary",
    ...(spellEffectKind ? { spellEffectKind } : {}),
    ...(showHit && damageTarget ? { damageTarget, damage: { amount: damage, armorBlocked: 0, outcome: "hit" as const, retaliation: false } } : {}),
    ...(slowMotion ? { slowMotion: true } : {}),
  };
}
