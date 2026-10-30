import type { CardDefinition, EnemyDefinition, FusionRecipe, MinionEffect, PlayerClass, PlayerClassDefinition, SpellEffect } from "./types.js";

const SUMMONED_CARD_NAMES: Readonly<Record<string, string>> = {
  "bone-rat": "뼈 쥐",
  "cinder-imp": "불씨 임프",
  "demon-lesser-imp": "하급 임프",
  "demon-ashling": "잿불 악마",
  "demon-cinder-fiend": "숯불 마귀",
  "matron-thornling": "가시 새끼",
  "grave-king-demon": "심연의 악마",
  "void-titan-whelp": "화염 비룡 새끼",
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
    if (effect.kind === "randomDamage") return `선택한 적 하수인 또는 적 영웅에게 0~5의 무작위 피해를 줍니다.`;
    if (effect.kind === "cleave") return `선택한 적 하수인에게 ${effect.amount}의 피해를 주고 양옆 하수인에게 ${Math.max(1, Math.floor(effect.amount / 2))}의 피해를 줍니다.`;
    if (effect.kind === "stealFromOpponentDeck") return `상대 덱에서 무작위 카드 1장을 가져와 손패에 추가합니다.`;
    if (effect.kind === "gainMana") return `마나 ${effect.amount}을 얻습니다.`;
    if (effect.kind === "discardRandom") return `손패에서 무작위 카드 1장을 버립니다.`;
    if (effect.kind === "gainTemporaryMana") return `이번 턴에만 임시 마나 ${effect.amount}을 얻습니다.`;
    if (effect.kind === "rootMinion") return `가장 공격력이 높은 적 하수인을 다음 턴 동안 속박합니다.`;
    if (effect.kind === "curseAllEnemyMinions") return `모든 적 하수인의 공격력을 ${effect.attackReduction} 낮춥니다. 다음 턴까지 지속됩니다.`;
    if (effect.kind === "burnEnemyHero") return `적 영웅에게 다음 2턴 동안 턴 시작마다 ${effect.damagePerTurn}의 화상 피해를 줍니다.`;
    if (effect.kind === "damageAllEnemyMinions") return `모든 적 하수인에게 ${effect.amount}의 피해를 줍니다.`;
    if (effect.kind === "soulHarvest") return `가장 강한 적 하수인 또는 적 영웅에게 ${effect.damage}의 피해를 주고 영웅을 ${effect.heal} 회복합니다.`;
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
  playerOnly = false,
): CardDefinition => ({
  id,
  name,
  kind: "spell",
  cost,
  description: describeSpellEffects(spellEffects),
  artKey: id,
  rewardTier,
  ...(playerOnly ? { playerOnly: true } : {}),
  spellEffects,
});

const BASE_CARD_CATALOG: readonly CardDefinition[] = [
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
  spell("mana-spring", "마력의 샘", 0, [{ kind: "gainMana", amount: 1 }], "normal", true),
  spell("soul-bargain", "영혼의 거래", 1, [{ kind: "discardRandom" }, { kind: "gainTemporaryMana", amount: 3 }]),
  spell("raise-bones", "뼈 무리", 3, [{ kind: "summon", cardId: "bone-rat", count: 2 }]),
  spell("rune-surge", "룬의 파동", 2, [{ kind: "buff", attack: 2, health: 1, target: "playerMinion" }]),
  spell("dark-insight", "어둠의 통찰", 3, [{ kind: "draw", count: 2 }]),
  spell("meteor-shard", "유성 파편", 5, [{ kind: "damage", amount: 5, target: "enemyMinion" }], "boss"),
  spell("life-thread", "생명의 실", 4, [{ kind: "heal", amount: 5, target: "playerMinion" }]),
  spell("soul-storm", "영혼 폭풍", 6, [{ kind: "damage", amount: 4, target: "enemyHero" }, { kind: "draw", count: 1 }], "boss"),
  spell("eclipse", "일식", 8, [{ kind: "damage", amount: 8, target: "enemyHero" }], "boss"),
  spell("fate-shard", "운명의 파편", 2, [{ kind: "randomDamage", min: 0, max: 5 }]),
  spell("reaper-cleave", "수확자의 칼날", 4, [{ kind: "cleave", amount: 4, target: "enemyMinion" }]),
  spell("stolen-fate", "빼앗은 운명", 3, [{ kind: "stealFromOpponentDeck", count: 1 }]),
];

function forClass(card: CardDefinition, classId: PlayerClass, race?: "demon"): CardDefinition {
  return { ...card, classId, ...(race ? { race } : {}) };
}

function demonToken(card: CardDefinition): CardDefinition {
  return { ...card, classId: "demonist", race: "demon", tokenOnly: true };
}

function bossOnly(card: CardDefinition, bossId: string, artKey: string): CardDefinition {
  return { ...card, artKey, rewardTier: "boss", enemyOnly: true, bossId };
}

function enemyToken(card: CardDefinition): CardDefinition {
  return { ...card, tokenOnly: true };
}

const BOSS_CARD_CATALOG: readonly CardDefinition[] = [
  bossOnly(spell("matron-thorn-prison", "가시 감옥", 3, [{ kind: "rootMinion", target: "enemyMinion", turns: 1 }], "boss"), "boss-blood-matron", "thorn-brute"),
  bossOnly(spell("matron-wither-curse", "시드는 저주", 4, [{ kind: "curseAllEnemyMinions", attackReduction: 2, turns: 1 }], "boss"), "boss-blood-matron", "plague-bearer"),
  bossOnly(minion("matron-briar-guardian", "가시숲의 수호자", 6, 5, 7, "boss", { kind: "battlecrySummon", cardId: "matron-thornling", count: 2 }), "boss-blood-matron", "ancient-treant"),
  bossOnly(spell("grave-king-soul-tithe", "영혼 십일조", 1, [{ kind: "discardRandom" }, { kind: "gainTemporaryMana", amount: 3 }, { kind: "summon", cardId: "grave-king-demon", count: 1 }], "boss"), "boss-grave-king", "soul-bargain"),
  bossOnly(spell("grave-king-pit-gate", "심연의 문", 6, [{ kind: "summon", cardId: "grave-king-demon", count: 2 }], "boss"), "boss-grave-king", "demonist-abyss-lord"),
  bossOnly(spell("grave-king-harvest", "군주의 수확", 5, [{ kind: "soulHarvest", damage: 5, heal: 5 }], "boss"), "boss-grave-king", "demonist-hellfire"),
  bossOnly(spell("void-titan-burning-mark", "용의 낙인", 3, [{ kind: "burnEnemyHero", damagePerTurn: 2, turns: 2 }], "boss"), "boss-void-titan", "meteor-shard"),
  bossOnly(spell("void-titan-inferno", "화염 숨결", 6, [{ kind: "damageAllEnemyMinions", amount: 4 }], "boss"), "boss-void-titan", "eclipse"),
  bossOnly(spell("void-titan-flame-legion", "화염군단", 7, [{ kind: "summon", cardId: "void-titan-whelp", count: 2 }], "boss"), "boss-void-titan", "storm-crow"),
  enemyToken(minion("matron-thornling", "가시 새끼", 0, 1, 1)),
  enemyToken(minion("grave-king-demon", "심연의 악마", 0, 4, 4)),
  enemyToken(minion("void-titan-whelp", "화염 비룡 새끼", 0, 3, 3)),
];

const CLASS_CARD_CATALOG: readonly CardDefinition[] = [
  forClass(minion("warrior-vanguard", "전위병", 1, 1, 4), "warrior"),
  forClass(minion("warrior-shield-maiden", "방패 여전사", 2, 2, 4, "normal", { kind: "battlecryBuff", attack: 0, health: 1, target: "self" }), "warrior"),
  forClass(minion("warrior-stonewall", "돌벽 수호자", 3, 2, 6), "warrior"),
  forClass(minion("warrior-banner-captain", "깃발 대장", 3, 3, 3, "normal", { kind: "battlecryBuff", attack: 1, health: 1, target: "otherFriendly" }), "warrior"),
  forClass(minion("warrior-oath-knight", "맹세의 기사", 4, 3, 6), "warrior"),
  forClass(minion("warrior-iron-ram", "철갑 돌격수", 4, 4, 4), "warrior"),
  forClass(minion("warrior-bastion-colossus", "성채 거인", 6, 5, 8), "warrior"),
  forClass(spell("warrior-brace", "철벽 태세", 1, [{ kind: "buff", attack: 0, health: 2, target: "playerMinion" }]), "warrior"),
  forClass(spell("warrior-hammerfall", "심판의 망치", 3, [{ kind: "damage", amount: 3, target: "enemyMinion" }]), "warrior"),
  forClass(spell("warrior-rally", "전장의 함성", 2, [{ kind: "buff", attack: 1, health: 1, target: "playerMinion" }]), "warrior"),

  forClass(minion("assassin-quickblade", "쾌검 암살자", 1, 3, 1), "assassin"),
  forClass(minion("assassin-night-knife", "밤의 비수", 2, 3, 2), "assassin"),
  forClass(minion("assassin-venom-dancer", "맹독 무희", 3, 4, 2, "normal", { kind: "battlecryBuff", attack: 1, health: 0, target: "self" }), "assassin"),
  forClass(minion("assassin-shadow-duelist", "그림자 결투가", 3, 3, 2, "normal", { kind: "deathSummon", cardId: "bone-rat", count: 1 }), "assassin"),
  forClass(minion("assassin-silk-stalker", "비단 추적자", 4, 5, 2), "assassin"),
  forClass(minion("assassin-blood-viper", "핏빛 독사", 4, 4, 3), "assassin"),
  forClass(minion("assassin-executioner", "처형인", 5, 6, 2), "assassin"),
  forClass(spell("assassin-venom-coat", "맹독 칼날", 1, [{ kind: "buff", attack: 2, health: 0, target: "playerMinion" }]), "assassin"),
  forClass(spell("assassin-shuriken", "그림자 수리검", 2, [{ kind: "damage", amount: 3, target: "enemyMinion" }]), "assassin"),
  forClass(spell("assassin-smoke-step", "연막 보법", 2, [{ kind: "draw", count: 1 }, { kind: "gainMana", amount: 1 }]), "assassin"),

  forClass(minion("demonist-imp-caller", "임프 소환사", 2, 1, 3, "normal", { kind: "battlecrySummon", cardId: "demon-lesser-imp", count: 1 }), "demonist"),
  forClass(minion("demonist-hellbound-adept", "지옥에 묶인 수련자", 2, 2, 2), "demonist", "demon"),
  forClass(minion("demonist-pit-ritualist", "구덩이 의식술사", 3, 2, 4, "normal", { kind: "battlecrySummon", cardId: "demon-ashling", count: 1 }), "demonist"),
  forClass(minion("demonist-demon-houndmaster", "악마 사냥개 조련사", 4, 4, 3), "demonist"),
  forClass(minion("demonist-infernal-guardian", "지옥불 수호자", 4, 3, 5), "demonist", "demon"),
  forClass(minion("demonist-summoner", "심연의 소환사", 5, 4, 5, "normal", { kind: "battlecrySummon", cardId: "demon-ashling", count: 1 }), "demonist"),
  forClass(minion("demonist-abyssal-matriarch", "심연의 여군주", 6, 5, 6, "normal", { kind: "battlecrySummon", cardId: "demon-lesser-imp", count: 2 }), "demonist", "demon"),
  forClass(spell("demonist-dark-rite", "어둠의 의식", 2, [{ kind: "summon", cardId: "demon-lesser-imp", count: 1 }]), "demonist"),
  forClass(spell("demonist-hellfire", "지옥불 작렬", 4, [{ kind: "damage", amount: 3, target: "enemyMinion" }]), "demonist"),
  forClass(spell("demonist-soul-bond", "영혼 결속", 2, [{ kind: "buff", attack: 1, health: 2, target: "playerMinion" }]), "demonist"),

  demonToken(minion("demon-lesser-imp", "하급 임프", 0, 1, 1)),
  demonToken(minion("demon-ashling", "잿불 악마", 0, 2, 2)),
  demonToken(minion("demon-cinder-fiend", "숯불 마귀", 0, 3, 2)),

  forClass(minion("warrior-fused-bulwark", "융합된 성채", 5, 4, 9), "warrior"),
  forClass(minion("warrior-iron-oath", "철의 맹세", 5, 5, 8, "normal", { kind: "battlecryBuff", attack: 1, health: 1, target: "self" }), "warrior"),
  forClass(minion("warrior-war-banner", "전쟁 깃발 거신", 6, 7, 7, "normal", { kind: "battlecryBuff", attack: 1, health: 1, target: "otherFriendly" }), "warrior"),

  forClass(minion("assassin-twinfang", "쌍송곳니", 3, 6, 3), "assassin"),
  forClass(minion("assassin-venom-empress", "맹독 여제", 5, 7, 4, "normal", { kind: "battlecryBuff", attack: 1, health: 0, target: "self" }), "assassin"),
  forClass(minion("assassin-red-mirror", "핏빛 거울", 5, 6, 5, "normal", { kind: "deathSummon", cardId: "bone-rat", count: 2 }), "assassin"),

  forClass(minion("demonist-greater-caller", "상급 악마 소환사", 5, 4, 6, "normal", { kind: "battlecrySummon", cardId: "demon-ashling", count: 1 }), "demonist"),
  forClass(minion("demonist-hellguard", "지옥의 파수장", 5, 5, 7), "demonist", "demon"),
  forClass(minion("demonist-abyss-lord", "심연의 군주", 7, 7, 8, "normal", { kind: "battlecrySummon", cardId: "demon-lesser-imp", count: 2 }), "demonist", "demon"),
];

export const CARD_CATALOG: readonly CardDefinition[] = [...BASE_CARD_CATALOG, ...CLASS_CARD_CATALOG, ...BOSS_CARD_CATALOG];

export const STARTER_DECK_CARD_IDS: readonly string[] = [
  "ash-wolf", "ash-wolf", "crypt-guard", "crypt-guard", "cinder-imp", "cinder-imp",
  "bone-rat", "bone-rat", "grave-knight", "grave-knight", "mire-witch", "mire-witch",
  "iron-hound", "iron-hound", "ember-priest", "ember-priest", "shade-stalker", "shade-stalker",
  "thorn-brute", "thorn-brute", "shadow-bolt", "shadow-bolt", "soul-lance", "soul-lance",
  "healing-mist", "mana-spring", "raise-bones", "raise-bones", "rune-surge", "rune-surge",
];

export const SHARED_STARTER_CARD_IDS: readonly string[] = [
  "ash-wolf", "ash-wolf", "crypt-guard", "crypt-guard", "cinder-imp", "cinder-imp",
  "bone-rat", "bone-rat", "grave-knight", "grave-knight", "mire-witch", "mire-witch",
  "iron-hound", "iron-hound", "ember-priest", "ember-priest", "shadow-bolt", "shadow-bolt",
  "mana-spring", "healing-mist",
];

const STARTER_CLASS_CARD_IDS: Readonly<Record<PlayerClass, readonly string[]>> = {
  warrior: ["warrior-vanguard", "warrior-shield-maiden", "warrior-stonewall", "warrior-banner-captain", "warrior-oath-knight", "warrior-iron-ram", "warrior-bastion-colossus", "warrior-brace", "warrior-hammerfall", "warrior-rally"],
  assassin: ["assassin-quickblade", "assassin-night-knife", "assassin-venom-dancer", "assassin-shadow-duelist", "assassin-silk-stalker", "assassin-blood-viper", "assassin-executioner", "assassin-venom-coat", "assassin-shuriken", "assassin-smoke-step"],
  demonist: ["demonist-imp-caller", "demonist-hellbound-adept", "demonist-pit-ritualist", "demonist-demon-houndmaster", "demonist-infernal-guardian", "demonist-summoner", "demonist-abyssal-matriarch", "demonist-dark-rite", "demonist-hellfire", "demonist-soul-bond"],
};

const classCards = (classId: PlayerClass): readonly string[] => STARTER_CLASS_CARD_IDS[classId];

export const PLAYER_CLASS_DEFINITIONS: readonly PlayerClassDefinition[] = [
  { id: "warrior", name: "전사", archetype: "체력과 방어력이 높은 하수인", heroPowerName: "방패 다지기", heroPowerDescription: "영웅에게 방어도 2를 부여합니다.", starterCardIds: classCards("warrior") },
  { id: "assassin", name: "암살자", archetype: "공격력과 특수 효과가 강한 하수인", heroPowerName: "그림자 습격", heroPowerDescription: "선택한 적 하수인 또는 적 영웅에게 피해 2를 줍니다.", starterCardIds: classCards("assassin") },
  { id: "demonist", name: "악마술사", archetype: "악마 소환과 하수인 연계", heroPowerName: "하급 악마 소환", heroPowerDescription: "하급 임프 1마리를 소환합니다.", starterCardIds: classCards("demonist") },
];

export const FUSION_RECIPES: readonly FusionRecipe[] = [
  { id: "warrior-bulwark", classId: "warrior", sourceCardIds: ["warrior-vanguard", "warrior-stonewall"], resultCardId: "warrior-fused-bulwark" },
  { id: "warrior-iron-oath", classId: "warrior", sourceCardIds: ["warrior-shield-maiden", "warrior-oath-knight"], resultCardId: "warrior-iron-oath" },
  { id: "warrior-war-banner", classId: "warrior", sourceCardIds: ["warrior-banner-captain", "warrior-iron-ram"], resultCardId: "warrior-war-banner" },
  { id: "assassin-twinfang", classId: "assassin", sourceCardIds: ["assassin-quickblade", "assassin-night-knife"], resultCardId: "assassin-twinfang" },
  { id: "assassin-venom-empress", classId: "assassin", sourceCardIds: ["assassin-venom-dancer", "assassin-silk-stalker"], resultCardId: "assassin-venom-empress" },
  { id: "assassin-red-mirror", classId: "assassin", sourceCardIds: ["assassin-shadow-duelist", "assassin-blood-viper"], resultCardId: "assassin-red-mirror" },
  { id: "demonist-greater-caller", classId: "demonist", sourceCardIds: ["demonist-imp-caller", "demonist-pit-ritualist"], resultCardId: "demonist-greater-caller" },
  { id: "demonist-hellguard", classId: "demonist", sourceCardIds: ["demonist-hellbound-adept", "demonist-infernal-guardian"], resultCardId: "demonist-hellguard" },
  { id: "demonist-abyss-lord", classId: "demonist", sourceCardIds: ["demonist-summoner", "demonist-abyssal-matriarch"], resultCardId: "demonist-abyss-lord" },
];

export const NORMAL_ENEMIES: readonly EnemyDefinition[] = [
  { id: "bandit-scout", name: "도적 정찰병", kind: "normal", maxHealth: 18, artKey: "bandit-scout", tactics: { profile: "aggressor" } },
  { id: "crypt-crawler", name: "묘지 포식자", kind: "normal", maxHealth: 21, artKey: "crypt-crawler", tactics: { profile: "summoner" } },
  { id: "mire-hag", name: "늪의 노파", kind: "normal", maxHealth: 20, artKey: "mire-hag", tactics: { profile: "controller" } },
  { id: "fallen-sentinel", name: "타락한 파수꾼", kind: "normal", maxHealth: 24, artKey: "fallen-sentinel", tactics: { profile: "hunter" } },
  { id: "plague-herald", name: "역병 전령", kind: "normal", maxHealth: 22, artKey: "plague-herald", tactics: { profile: "summoner" } },
  { id: "night-stalker", name: "밤의 추적자", kind: "normal", maxHealth: 25, artKey: "night-stalker", tactics: { profile: "hunter" } },
];

export const NORMAL_ENEMIES_BY_PHASE: Readonly<Record<1 | 2 | 3, readonly [EnemyDefinition, EnemyDefinition, EnemyDefinition]>> = {
  1: [
    { id: "fallen-elf-scout", name: "타락한 엘프 정찰자", kind: "normal", maxHealth: 19, artKey: "fallen-elf-scout", tactics: { profile: "hunter" } },
    { id: "thorn-cursed-dryad", name: "가시에 저주받은 드리아드", kind: "normal", maxHealth: 21, artKey: "thorn-cursed-dryad", tactics: { profile: "controller" } },
    { id: "forest-watcher", name: "저주숲 감시자", kind: "normal", maxHealth: 22, artKey: "forest-watcher", tactics: { profile: "summoner" } },
  ],
  2: [
    { id: "imp-raider", name: "임프 약탈자", kind: "normal", maxHealth: 20, artKey: "imp-raider", tactics: { profile: "aggressor" } },
    { id: "abyss-cultist", name: "심연의 숭배자", kind: "normal", maxHealth: 22, artKey: "abyss-cultist", tactics: { profile: "summoner" } },
    { id: "demon-brute", name: "지옥의 투사", kind: "normal", maxHealth: 25, artKey: "demon-brute", tactics: { profile: "hunter" } },
  ],
  3: [
    { id: "ember-legionnaire", name: "화염군단 보병", kind: "normal", maxHealth: 23, artKey: "ember-legionnaire", tactics: { profile: "aggressor" } },
    { id: "drake-soldier", name: "용혈 전사", kind: "normal", maxHealth: 25, artKey: "drake-soldier", tactics: { profile: "hunter" } },
    { id: "flame-wyrm", name: "불꽃 비룡", kind: "normal", maxHealth: 27, artKey: "flame-wyrm", tactics: { profile: "ravager" } },
  ],
};

export const BOSSES: readonly EnemyDefinition[] = [
  { id: "boss-blood-matron", name: "타락한 숲의 여왕", kind: "boss", maxHealth: 34, artKey: "boss-blood-matron", tactics: { profile: "drain" } },
  { id: "boss-grave-king", name: "심연의 악마 군주", kind: "boss", maxHealth: 40, artKey: "boss-grave-king", tactics: { profile: "board-clear" } },
  { id: "boss-void-titan", name: "고대 화염룡", kind: "boss", maxHealth: 48, artKey: "boss-void-titan", tactics: { profile: "ravager" } },
];

export const CARD_BY_ID: ReadonlyMap<string, CardDefinition> = new Map(CARD_CATALOG.map((card) => [card.id, card]));
export const ENEMY_BY_ID: ReadonlyMap<string, EnemyDefinition> = new Map(
  [...NORMAL_ENEMIES, ...Object.values(NORMAL_ENEMIES_BY_PHASE).flat(), ...BOSSES].map((enemy) => [enemy.id, enemy]),
);
