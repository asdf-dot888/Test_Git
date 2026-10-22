import type { CardDefinition, EnemyDefinition, MinionEffect, SpellEffect } from "./types.js";

const SUMMONED_CARD_NAMES: Readonly<Record<string, string>> = {
  "bone-rat": "뼈 쥐",
  "cinder-imp": "불씨 임프",
};

function summonedCardName(cardId: string): string {
  const name = SUMMONED_CARD_NAMES[cardId];
  if (!name) throw new Error(`Missing display name for summoned card: ${cardId}`);
  return name;
}

function describeStatChanges(attack: number, health: number): string {
  const changes = [
    attack > 0 ? `공격력 +${attack}` : "",
    health > 0 ? `체력 +${health}` : "",
  ].filter(Boolean);
  return changes.join(" 및 ");
}

function statChangesParticle(attack: number, health: number): string {
  return attack === 0 && health > 0 ? "를" : "을";
}

function describeMinionEffect(effect: MinionEffect | undefined): string {
  if (!effect) return "특수 효과 없음";
  if (effect.kind === "battlecrySummon") {
    return `전투의 함성: ${summonedCardName(effect.cardId)} ${effect.count}마리를 소환합니다.`;
  }
  if (effect.kind === "deathSummon") {
    return `죽음의 메아리: ${summonedCardName(effect.cardId)} ${effect.count}마리를 소환합니다.`;
  }

  const target = effect.target === "self" ? "자신" : "다른 아군 하수인";
  return `전투의 함성: ${target}에게 ${describeStatChanges(effect.attack, effect.health)}${statChangesParticle(effect.attack, effect.health)} 부여합니다.`;
}

function describeSpellEffects(effects: readonly SpellEffect[]): string {
  return effects.map((effect) => {
    if (effect.kind === "damage") {
      const target = effect.target === "enemyHero" ? "적 영웅" : "적 하수인";
      return `${target}에게 ${effect.amount}의 피해를 줍니다.`;
    }
    if (effect.kind === "heal") {
      const target = effect.target === "playerHero" ? "내 영웅" : "아군 하수인";
      return `${target}의 체력을 ${effect.amount} 회복합니다.`;
    }
    if (effect.kind === "summon") {
      return `${summonedCardName(effect.cardId)} ${effect.count}마리를 소환합니다.`;
    }
    if (effect.kind === "buff") {
      return `아군 하수인에게 ${describeStatChanges(effect.attack, effect.health)}${statChangesParticle(effect.attack, effect.health)} 부여합니다.`;
    }
    return `카드를 ${effect.count}장 뽑습니다.`;
  }).join(" / ");
}

const minion = (
  id: string,
  name: string,
  cost: number,
  attack: number,
  maxHealth: number,
  rewardTier: "normal" | "boss" = "normal",
  effect?: NonNullable<CardDefinition["minion"]>["effect"],
): CardDefinition => ({
  id,
  name,
  kind: "minion",
  cost,
  description: describeMinionEffect(effect),
  artKey: id,
  rewardTier,
  minion: effect ? { attack, maxHealth, effect } : { attack, maxHealth },
});

const spell = (
  id: string,
  name: string,
  cost: number,
  spellEffects: NonNullable<CardDefinition["spellEffects"]>,
  rewardTier: "normal" | "boss" = "normal",
): CardDefinition => ({
  id,
  name,
  kind: "spell",
  cost,
  description: describeSpellEffects(spellEffects),
  artKey: id,
  rewardTier,
  spellEffects,
});

export const CARD_CATALOG: readonly CardDefinition[] = [
  minion("ash-wolf", "잿빛 늑대", 1, 2, 1),
  minion("crypt-guard", "묘지기 경비병", 2, 2, 3),
  minion("cinder-imp", "불씨 임프", 1, 1, 2, "normal", { kind: "battlecrySummon", cardId: "bone-rat", count: 1 }),
  minion("bone-rat", "뼈 쥐", 1, 1, 1),
  minion("grave-knight", "무덤 기사", 3, 3, 3, "normal", { kind: "battlecryBuff", attack: 1, health: 1, target: "otherFriendly" }),
  minion("mire-witch", "수렁 마녀", 4, 3, 4, "normal", { kind: "battlecrySummon", cardId: "bone-rat", count: 1 }),
  minion("iron-hound", "철갑 사냥개", 3, 3, 4),
  minion("ember-priest", "잿불 사제", 2, 2, 2, "normal", { kind: "battlecryBuff", attack: 0, health: 2, target: "self" }),
  minion("shade-stalker", "그림자 추적자", 4, 4, 2),
  minion("thorn-brute", "가시 야수", 5, 4, 6, "normal", { kind: "deathSummon", cardId: "bone-rat", count: 1 }),
  minion("dusk-raven", "황혼 까마귀", 2, 3, 1),
  minion("plague-bearer", "역병 운반자", 4, 3, 5, "normal", { kind: "deathSummon", cardId: "cinder-imp", count: 1 }),
  minion("rune-smith", "룬 대장장이", 3, 2, 4, "normal", { kind: "battlecryBuff", attack: 1, health: 0, target: "self" }),
  minion("moon-stag", "달빛 사슴", 5, 5, 4),
  minion("hollow-giant", "공허 거인", 7, 7, 7, "boss"),
  minion("blood-oracle", "핏빛 예언자", 6, 4, 7, "boss", { kind: "battlecryBuff", attack: 0, health: 2, target: "self" }),
  minion("frost-wraith", "서리 망령", 4, 3, 4, "normal", { kind: "deathSummon", cardId: "bone-rat", count: 2 }),
  minion("storm-crow", "폭풍 까마귀", 6, 6, 4, "boss"),
  minion("ancient-treant", "고대 수호목", 8, 5, 10, "boss"),
  minion("dread-colossus", "공포의 거신", 9, 8, 9, "boss"),

  spell("shadow-bolt", "그림자 화살", 1, [{ kind: "damage", amount: 2, target: "enemyHero" }]),
  spell("soul-lance", "영혼 창", 2, [{ kind: "damage", amount: 3, target: "enemyMinion" }]),
  spell("healing-mist", "치유 안개", 2, [{ kind: "heal", amount: 4, target: "playerHero" }]),
  spell("raise-bones", "뼈 무리", 3, [{ kind: "summon", cardId: "bone-rat", count: 2 }]),
  spell("rune-surge", "룬의 파동", 2, [{ kind: "buff", attack: 2, health: 1, target: "playerMinion" }]),
  spell("dark-insight", "어둠의 통찰", 3, [{ kind: "draw", count: 2 }]),
  spell("meteor-shard", "유성 파편", 5, [{ kind: "damage", amount: 5, target: "enemyMinion" }], "boss"),
  spell("life-thread", "생명의 실", 4, [{ kind: "heal", amount: 5, target: "playerMinion" }]),
  spell("soul-storm", "영혼 폭풍", 6, [{ kind: "damage", amount: 4, target: "enemyHero" }, { kind: "draw", count: 1 }], "boss"),
  spell("eclipse", "일식", 8, [{ kind: "damage", amount: 8, target: "enemyHero" }], "boss"),
];

export const STARTER_DECK_CARD_IDS: readonly string[] = [
  "ash-wolf", "ash-wolf", "crypt-guard", "crypt-guard", "cinder-imp", "cinder-imp",
  "bone-rat", "bone-rat", "grave-knight", "grave-knight", "mire-witch", "mire-witch",
  "iron-hound", "iron-hound", "ember-priest", "ember-priest", "shade-stalker", "shade-stalker",
  "thorn-brute", "thorn-brute", "shadow-bolt", "shadow-bolt", "soul-lance", "soul-lance",
  "healing-mist", "healing-mist", "raise-bones", "raise-bones", "rune-surge", "rune-surge",
];

export const NORMAL_ENEMIES: readonly EnemyDefinition[] = [
  { id: "bandit-scout", name: "도적 정찰병", kind: "normal", maxHealth: 18, artKey: "bandit-scout", tactics: { profile: "aggressor", chargeTrigger: "hero-at-half", chargeDelayTurns: 1, chargeDamage: 6 }, actions: [{ kind: "heroDamage", amount: 3 }, { kind: "summon", cardId: "bone-rat" }] },
  { id: "crypt-crawler", name: "묘지 포식자", kind: "normal", maxHealth: 21, artKey: "crypt-crawler", tactics: { profile: "summoner", chargeTrigger: "board-wide", chargeDelayTurns: 2, chargeDamage: 8 }, actions: [{ kind: "heroDamage", amount: 4 }, { kind: "summon", cardId: "cinder-imp" }] },
  { id: "mire-hag", name: "늪의 노파", kind: "normal", maxHealth: 20, artKey: "mire-hag", tactics: { profile: "controller", chargeTrigger: "hero-at-half", chargeDelayTurns: 2, chargeDamage: 6 }, actions: [{ kind: "heroDamage", amount: 3 }, { kind: "summon", cardId: "ash-wolf" }] },
  { id: "fallen-sentinel", name: "타락한 파수꾼", kind: "normal", maxHealth: 24, artKey: "fallen-sentinel", tactics: { profile: "hunter", chargeTrigger: "board-empty", chargeDelayTurns: 1, chargeDamage: 10 }, actions: [{ kind: "heroDamage", amount: 5 }, { kind: "summon", cardId: "crypt-guard" }] },
  { id: "plague-herald", name: "역병 전령", kind: "normal", maxHealth: 22, artKey: "plague-herald", tactics: { profile: "summoner", chargeTrigger: "board-wide", chargeDelayTurns: 1, chargeDamage: 8 }, actions: [{ kind: "heroDamage", amount: 4 }, { kind: "summon", cardId: "bone-rat" }] },
  { id: "night-stalker", name: "밤의 추적자", kind: "normal", maxHealth: 25, artKey: "night-stalker", tactics: { profile: "hunter", chargeTrigger: "hero-low-and-board-empty", chargeDelayTurns: 2, chargeDamage: 10 }, actions: [{ kind: "heroDamage", amount: 5 }, { kind: "summon", cardId: "dusk-raven" }] },
];

export const BOSSES: readonly EnemyDefinition[] = [
  { id: "boss-blood-matron", name: "핏빛 여왕", kind: "boss", maxHealth: 34, artKey: "boss-blood-matron", tactics: { profile: "drain", chargeTrigger: "hero-at-half", chargeDelayTurns: 1, chargeDamage: 10 }, actions: [{ kind: "heroDamage", amount: 5 }, { kind: "summon", cardId: "grave-knight" }, { kind: "bossEffect", effectId: "blood-tithe", amount: 3 }] },
  { id: "boss-grave-king", name: "무덤의 왕", kind: "boss", maxHealth: 40, artKey: "boss-grave-king", tactics: { profile: "board-clear", chargeTrigger: "board-wide", chargeDelayTurns: 1, chargeDamage: 12 }, actions: [{ kind: "heroDamage", amount: 6 }, { kind: "summon", cardId: "frost-wraith" }, { kind: "bossEffect", effectId: "bone-storm", amount: 2 }] },
  { id: "boss-void-titan", name: "공허의 거신", kind: "boss", maxHealth: 48, artKey: "boss-void-titan", tactics: { profile: "ravager", chargeTrigger: "turn-four", chargeDelayTurns: 2, chargeDamage: 14 }, actions: [{ kind: "heroDamage", amount: 7 }, { kind: "summon", cardId: "hollow-giant" }, { kind: "bossEffect", effectId: "void-pulse", amount: 4 }] },
];

export const CARD_BY_ID: ReadonlyMap<string, CardDefinition> = new Map(CARD_CATALOG.map((card) => [card.id, card]));
export const ENEMY_BY_ID: ReadonlyMap<string, EnemyDefinition> = new Map(
  [...NORMAL_ENEMIES, ...BOSSES].map((enemy) => [enemy.id, enemy]),
);
