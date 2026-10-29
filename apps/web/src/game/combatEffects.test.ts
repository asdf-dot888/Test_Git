import { describe, expect, it } from "vitest";
import { CARD_CATALOG, attackAllReadyMinions, attackWithMinion, createRun, type RunState } from "@board-game/game-core";
import { CARD_COMBAT_VISUAL_PROFILES, combatImpactTier, collectCombatEffectEvents, collectEnemyActionEffects } from "./combatEffects.js";

function withBattle(run: RunState, update: (run: RunState) => void): RunState {
  const next = structuredClone(run);
  update(next);
  return next;
}

describe("collectCombatEffectEvents", () => {
  it("maps damage into distinct presentation tiers", () => {
    expect([0, 1, 2, 3, 4, 5].map(combatImpactTier)).toEqual([null, "light", "light", "medium", "medium", "heavy"]);
  });

  it("marks only the lethal player attack for slow motion", () => {
    const run = createRun(38);
    const before = withBattle(run, (state) => {
      state.battle!.enemyHero.health = 2;
      state.battle!.playerBoard = [{ instanceId: "lethal-attacker", cardId: "ash-wolf", owner: "player", attack: 3, health: 4, maxHealth: 4, summonedTurn: 0, hasAttacked: false }];
    });
    const after = attackWithMinion(before, "lethal-attacker", "enemy");
    const events = collectCombatEffectEvents(before, after, { type: "attack", attackerId: "lethal-attacker", targetId: "enemy" }, 1);
    expect(events).toHaveLength(1);
    expect(events[0]?.slowMotion).toBe(true);

    const ordinary = withBattle(before, (state) => { state.battle!.enemyHero.health = 3; });
    const ordinaryEvents = collectCombatEffectEvents(ordinary, ordinary, { type: "attack", attackerId: "lethal-attacker", targetId: "enemy" }, 5);
    expect(ordinaryEvents[0]?.slowMotion).toBeUndefined();
  });

  it("slows only the final lethal attacker in an all-attack sequence", () => {
    const run = createRun(37);
    const before = withBattle(run, (state) => {
      state.battle!.enemyHero.health = 4;
      state.battle!.playerBoard = [
        { instanceId: "first-strike", cardId: "ash-wolf", owner: "player", attack: 2, health: 4, maxHealth: 4, summonedTurn: 0, hasAttacked: false },
        { instanceId: "last-strike", cardId: "crypt-guard", owner: "player", attack: 3, health: 5, maxHealth: 5, summonedTurn: 0, hasAttacked: false },
      ];
    });
    const after = attackAllReadyMinions(before);
    const events = collectCombatEffectEvents(before, after, { type: "all-attack" }, 10);
    expect(events).toHaveLength(2);
    expect(events[0]?.slowMotion).toBeUndefined();
    expect(events[1]?.slowMotion).toBe(true);
  });

  it("assigns a stable distinct visual profile to every catalog card", () => {
    expect(Object.keys(CARD_COMBAT_VISUAL_PROFILES).sort()).toEqual(CARD_CATALOG.map((card) => card.id).sort());
    expect(new Set(Object.values(CARD_COMBAT_VISUAL_PROFILES).map((profile) => profile.accent)).size).toBe(CARD_CATALOG.length);
    for (const profile of Object.values(CARD_COMBAT_VISUAL_PROFILES)) {
      expect(profile.particles).toMatch(/^(ember|rune|shadow|steel|bone)$/);
      expect(profile.motionClass).toMatch(/^(slash|arcane|guard|summon)$/);
      expect(profile.durationMs).toBeGreaterThanOrEqual(930);
      expect(profile.durationMs).toBeLessThan(1280);
    }
  });

  it("renders both sides of reciprocal minion combat as separate impacts", () => {
    const run = createRun(39);
    const before = withBattle(run, (state) => {
      state.battle!.enemyBoard = [{ instanceId: "enemy-wolf", cardId: "ash-wolf", owner: "enemy", attack: 2, health: 4, maxHealth: 4, summonedTurn: 0, hasAttacked: false }];
      state.battle!.playerBoard = [{ instanceId: "player-guard", cardId: "crypt-guard", owner: "player", attack: 3, health: 5, maxHealth: 5, summonedTurn: 0, hasAttacked: false }];
    });
    const after = withBattle(before, (state) => {
      state.battle!.enemyBoard[0]!.health = 1;
      state.battle!.playerBoard[0]!.health = 3;
    });
    const events = collectEnemyActionEffects(before, after, { type: "attack", cardId: "ash-wolf", attackerId: "enemy-wolf", targetId: "player-guard" }, 50);

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ id: 50, assetCardId: "ash-wolf", effectKind: "attack", source: { kind: "minion", side: "enemy", slot: 0 }, target: { kind: "minion", side: "player", slot: 0 }, damageTarget: "minion" });
    expect(events[1]).toMatchObject({ id: 51, assetCardId: "crypt-guard", effectKind: "attack", source: { kind: "minion", side: "player", slot: 0 }, target: { kind: "minion", side: "enemy", slot: 0 }, damageTarget: "minion" });

    const bothDie = withBattle(before, (state) => {
      state.battle!.enemyBoard = [];
      state.battle!.playerBoard = [];
    });
    const lethalEvents = collectEnemyActionEffects(before, bothDie, { type: "attack", cardId: "ash-wolf", attackerId: "enemy-wolf", targetId: "player-guard" }, 60);
    expect(lethalEvents.map((event) => event.soundCues)).toEqual([
      ["minion-attack", "damage", "death"],
      ["minion-attack", "damage", "death"],
    ]);
    expect(lethalEvents.map((event) => event.deathAnchors?.length ?? 0)).toEqual([1, 1]);
  });

  it("plays a summon cue for played minions and their battlecry summons", () => {
    const run = createRun(40);
    const before = withBattle(run, (state) => { state.battle!.hand = [{ instanceId: "witch", cardId: "mire-witch" }]; });
    const after = withBattle(before, (state) => {
      state.battle!.hand = [];
      state.battle!.playerBoard = [
        { instanceId: "witch", cardId: "mire-witch", owner: "player", attack: 3, health: 4, maxHealth: 4, summonedTurn: 1, hasAttacked: false },
        { instanceId: "rat", cardId: "bone-rat", owner: "player", attack: 1, health: 1, maxHealth: 1, summonedTurn: 1, hasAttacked: false },
      ];
    });
    const events = collectCombatEffectEvents(before, after, { type: "play-minion", instanceId: "witch" }, 5);

    expect(events.map(({ effectKind, assetCardId, soundCues }) => [effectKind, assetCardId, soundCues])).toEqual([
      ["summon", "mire-witch", ["summon"]],
      ["summon", "mire-witch", ["summon"]],
    ]);
    expect(events.every((event) => !("damageTarget" in event))).toBe(true);
  });

  it("plays summon cues for spells and enemy summons", () => {
    const run = createRun(401);
    const before = withBattle(run, (state) => { state.battle!.hand = [{ instanceId: "bones", cardId: "raise-bones" }]; });
    const spellEvents = collectCombatEffectEvents(before, before, { type: "cast-spell", instanceId: "bones" }, 8);
    expect(spellEvents.map((event) => event.soundCues)).toEqual([["summon"]]);

    const after = withBattle(before, (state) => {
      state.battle!.enemyBoard = [{ instanceId: "enemy-rat", cardId: "bone-rat", owner: "enemy", attack: 1, health: 1, maxHealth: 1, summonedTurn: 1, hasAttacked: false }];
      state.battle!.hand = [];
      state.battle!.enemyTurnEvents = [{ type: "play-minion", cardId: "bone-rat", instanceId: "enemy-rat", handSlot: 0, summonedIds: ["enemy-rat"] }];
    });
    const enemyEvents = collectCombatEffectEvents(before, after, { type: "end-turn" }, 20);
    expect(enemyEvents).toContainEqual(expect.objectContaining({ effectKind: "summon", assetCardId: "bone-rat", soundCues: ["summon"], target: { kind: "minion", side: "enemy", slot: 0 } }));
  });

  it("plays a magical cue for a battlecry buff", () => {
    const run = createRun(402);
    const before = withBattle(run, (state) => {
      state.battle!.hand = [{ instanceId: "knight", cardId: "grave-knight" }];
      state.battle!.playerBoard = [{ instanceId: "guard", cardId: "crypt-guard", owner: "player", attack: 2, health: 3, maxHealth: 3, summonedTurn: 0, hasAttacked: false }];
    });
    const after = withBattle(before, (state) => {
      state.battle!.hand = [];
      state.battle!.playerBoard = [
        { instanceId: "guard", cardId: "crypt-guard", owner: "player", attack: 3, health: 4, maxHealth: 4, summonedTurn: 0, hasAttacked: false },
        { instanceId: "knight", cardId: "grave-knight", owner: "player", attack: 3, health: 3, maxHealth: 3, summonedTurn: 1, hasAttacked: false },
      ];
    });
    const events = collectCombatEffectEvents(before, after, { type: "play-minion", instanceId: "knight" }, 10);
    expect(events.map((event) => event.soundCues)).toEqual([["summon"], ["spell"]]);
  });

  it("anchors summons to the sixth player lane slot", () => {
    const run = createRun(411);
    const before = withBattle(run, (state) => {
      state.battle!.hand = [{ instanceId: "sixth-minion", cardId: "ash-wolf" }];
      state.battle!.playerBoard = Array.from({ length: 5 }, (_, index) => ({ instanceId: `existing-${index}`, cardId: "bone-rat", owner: "player" as const, attack: 1, health: 1, maxHealth: 1, summonedTurn: 0, hasAttacked: false }));
    });
    const after = withBattle(before, (state) => {
      state.battle!.hand = [];
      state.battle!.playerBoard.push({ instanceId: "sixth-minion", cardId: "ash-wolf", owner: "player", attack: 2, health: 4, maxHealth: 4, summonedTurn: 1, hasAttacked: false });
    });
    const events = collectCombatEffectEvents(before, after, { type: "play-minion", instanceId: "sixth-minion" }, 11);
    expect(events[0]?.target).toEqual({ kind: "minion", side: "player", slot: 5 });
  });

  it("anchors a minion attack to the attacker card and exact lane slots", () => {
    const run = createRun(41);
    const before = withBattle(run, (state) => {
      state.battle!.playerBoard = [{ instanceId: "wolf", cardId: "ash-wolf", owner: "player", attack: 2, health: 1, maxHealth: 1, summonedTurn: 0, hasAttacked: false }];
      state.battle!.enemyBoard = [{ instanceId: "guard", cardId: "crypt-guard", owner: "enemy", attack: 2, health: 3, maxHealth: 3, summonedTurn: 0, hasAttacked: false }];
    });
    const events = collectCombatEffectEvents(before, before, { type: "attack", attackerId: "wolf", targetId: "guard" }, 12);

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ id: 12, assetCardId: "ash-wolf", effectKind: "attack", source: { kind: "minion", side: "player", slot: 0 }, target: { kind: "minion", side: "enemy", slot: 0 }, damageTarget: "minion", damage: { amount: 2, armorBlocked: 0, outcome: "hit", retaliation: false } });
    expect(events[1]).toMatchObject({ id: 13, assetCardId: "crypt-guard", effectKind: "attack", source: { kind: "minion", side: "enemy", slot: 0 }, target: { kind: "minion", side: "player", slot: 0 }, damageTarget: "minion", damage: { amount: 2, armorBlocked: 0, outcome: "hit", retaliation: true } });
  });

  it("creates one event for each enemy minion attack during its turn", () => {
    const run = createRun(42);
    const before = withBattle(run, (state) => {
      state.battle!.playerBoard = [0, 1].map((index) => ({ instanceId: `player-${index}`, cardId: "ash-wolf", owner: "player" as const, attack: 2, health: 3, maxHealth: 3, summonedTurn: 0, hasAttacked: false }));
      state.battle!.enemyBoard = [0, 1].map((index) => ({ instanceId: `enemy-${index}`, cardId: "bone-rat", owner: "enemy" as const, attack: 1, health: 1, maxHealth: 1, summonedTurn: 0, hasAttacked: false }));
    });
    const after = withBattle(before, (state) => {
      state.battle!.turnNumber = 2;
      state.battle!.enemyBoard.forEach((minion) => { minion.hasAttacked = true; });
      state.battle!.playerBoard.forEach((minion) => { minion.health = 2; });
      state.battle!.enemyTurnEvents = [0, 1].map((index) => ({ type: "attack" as const, cardId: "bone-rat", attackerId: `enemy-${index}`, targetId: `player-${index}` }));
    });
    const events = collectCombatEffectEvents(before, after, { type: "end-turn" }, 20);

    expect(events).toHaveLength(4);
    expect(events.map(({ assetCardId, source, target }) => [assetCardId, source, target])).toEqual([
      ["bone-rat", { kind: "minion", side: "enemy", slot: 0 }, { kind: "minion", side: "player", slot: 0 }],
      ["ash-wolf", { kind: "minion", side: "player", slot: 0 }, { kind: "minion", side: "enemy", slot: 0 }],
      ["bone-rat", { kind: "minion", side: "enemy", slot: 1 }, { kind: "minion", side: "player", slot: 1 }],
      ["ash-wolf", { kind: "minion", side: "player", slot: 1 }, { kind: "minion", side: "enemy", slot: 1 }],
    ]);
    expect(events.map((event) => event.soundCues)).toEqual([
      ["minion-attack", "damage"], ["minion-attack", "damage"],
      ["minion-attack", "damage"], ["minion-attack", "damage"],
    ]);
  });

  it("keeps the spell card id and hand source for spell damage and common hero impact", () => {
    const run = createRun(43);
    const before = withBattle(run, (state) => {
      state.battle!.hand = [{ instanceId: "lance", cardId: "soul-lance" }];
      state.battle!.enemyBoard = [{ instanceId: "target", cardId: "bone-rat", owner: "enemy", attack: 1, health: 1, maxHealth: 1, summonedTurn: 0, hasAttacked: false }];
    });
    const spell = collectCombatEffectEvents(before, before, { type: "cast-spell", instanceId: "lance", targetId: "target" }, 4);
    expect(spell).toHaveLength(1);
    expect(spell[0]).toMatchObject({ assetCardId: "soul-lance", effectKind: "damage", source: { kind: "hand", side: "player", slot: 0, instanceId: "lance" }, target: { kind: "minion", side: "enemy", slot: 0 } });
    expect(spell[0]?.damageTarget).toBe("minion");
    expect(spell[0]?.damage).toEqual({ amount: 3, armorBlocked: 0, outcome: "hit", retaliation: false });
    expect(spell[0]?.soundCues).toEqual(["spell", "damage"]);

    const after = withBattle(before, (state) => { state.battle!.playerHero.health -= 3; });
    const impact = collectCombatEffectEvents(before, after, { type: "end-turn" }, 9);
    expect(impact[0]).toMatchObject({ assetCardId: null, effectKind: "impact", soundCues: ["damage"], source: { kind: "hero", side: "enemy" }, target: { kind: "hero", side: "player" }, damageTarget: "hero" });
    expect(impact[0]?.damage).toMatchObject({ amount: 3, armorBlocked: 0, outcome: "hit", retaliation: false });
  });

  it("keeps cleave damage independent for every affected target", () => {
    const before = withBattle(createRun(430), (state) => {
      state.battle!.hand = [{ instanceId: "cleave", cardId: "reaper-cleave" }];
      state.battle!.enemyBoard = ["left", "center", "right"].map((instanceId) => ({ instanceId, cardId: "bone-rat", owner: "enemy" as const, attack: 1, health: 8, maxHealth: 8, summonedTurn: 0, hasAttacked: false }));
    });
    const [event] = collectCombatEffectEvents(before, before, { type: "cast-spell", instanceId: "cleave", targetId: "center" }, 10);
    expect(event?.damage).toMatchObject({ amount: 4, outcome: "hit" });
    expect(event?.affectedTargets?.map(({ target, damage }) => [target, damage.amount])).toEqual([
      [{ kind: "minion", side: "enemy", slot: 0 }, 2],
      [{ kind: "minion", side: "enemy", slot: 1 }, 4],
      [{ kind: "minion", side: "enemy", slot: 2 }, 2],
    ]);
  });

  it("distinguishes a fully armor-blocked hero hit from health damage", () => {
    const before = withBattle(createRun(430), (state) => {
      state.battle!.playerArmor = 2;
      state.battle!.enemyBoard = [{ instanceId: "enemy", cardId: "bone-rat", owner: "enemy", attack: 1, health: 1, maxHealth: 1, summonedTurn: 0, hasAttacked: false }];
    });
    const after = withBattle(before, (state) => { state.battle!.playerArmor = 1; });
    const [event] = collectEnemyActionEffects(before, after, { type: "attack", cardId: "bone-rat", attackerId: "enemy", targetId: "player-hero" }, 1);
    expect(event?.damage).toEqual({ amount: 0, armorBlocked: 1, outcome: "armor-block", retaliation: false });
  });

  it("classifies direct spell, enemy attack, and Assassin hero-power damage by target", () => {
    const spellBefore = withBattle(createRun(431), (state) => {
      state.battle!.hand = [{ instanceId: "bolt", cardId: "shadow-bolt" }];
    });
    const heroSpell = collectCombatEffectEvents(spellBefore, spellBefore, { type: "cast-spell", instanceId: "bolt" }, 1);
    expect(heroSpell[0]?.damageTarget).toBe("hero");

    const enemyBefore = withBattle(createRun(432), (state) => {
      state.battle!.enemyBoard = [{ instanceId: "enemy", cardId: "bone-rat", owner: "enemy", attack: 1, health: 1, maxHealth: 1, summonedTurn: 0, hasAttacked: false }];
    });
    const enemyHit = collectEnemyActionEffects(enemyBefore, enemyBefore, { type: "attack", cardId: "bone-rat", attackerId: "enemy", targetId: "player-hero" }, 2);
    expect(enemyHit[0]?.damageTarget).toBe("hero");
    expect(enemyHit[0]?.damage).toMatchObject({ amount: 1, armorBlocked: 0, outcome: "hit" });

    const assassin = withBattle(createRun(433, "assassin"), (state) => {
      state.battle!.enemyBoard = [{ instanceId: "target", cardId: "bone-rat", owner: "enemy", attack: 1, health: 1, maxHealth: 1, summonedTurn: 0, hasAttacked: false }];
    });
    expect(collectCombatEffectEvents(assassin, assassin, { type: "use-hero-power", targetId: "target" }, 3)[0]?.damageTarget).toBe("minion");
    expect(collectCombatEffectEvents(assassin, assassin, { type: "use-hero-power", targetId: "enemy-hero" }, 4)[0]?.damageTarget).toBe("hero");
  });

  it("maps Soul Bargain discard and temporary mana to existing combat visuals", () => {
    const before = withBattle(createRun(432), (state) => {
      state.battle!.hand = [{ instanceId: "bargain", cardId: "soul-bargain" }];
    });
    const events = collectCombatEffectEvents(before, before, { type: "cast-spell", instanceId: "bargain" }, 30);
    expect(events.map(({ effectKind, soundCues, target }) => [effectKind, soundCues, target])).toEqual([
      ["theft", ["spell"], { kind: "hand", side: "player", slot: 1 }],
      ["mana", ["spell"], { kind: "hero", side: "player" }],
    ]);
  });

  it("cues spell damage, minion death, and healing separately", () => {
    const run = createRun(431);
    const before = withBattle(run, (state) => {
      state.battle!.hand = [{ instanceId: "lance", cardId: "soul-lance" }, { instanceId: "mist", cardId: "healing-mist" }];
      state.battle!.enemyBoard = [{ instanceId: "target", cardId: "bone-rat", owner: "enemy", attack: 1, health: 1, maxHealth: 1, summonedTurn: 0, hasAttacked: false }];
    });
    const afterDamage = withBattle(before, (state) => { state.battle!.enemyBoard = []; });
    const damage = collectCombatEffectEvents(before, afterDamage, { type: "cast-spell", instanceId: "lance", targetId: "target" }, 70);
    expect(damage[0]?.soundCues).toEqual(["spell", "damage", "death"]);

    const heal = collectCombatEffectEvents(before, before, { type: "cast-spell", instanceId: "mist" }, 80);
    expect(heal[0]?.soundCues).toEqual(["spell", "heal"]);
  });

  it("maps enemy card, targeted spell, minion attack, and boss area records in order", () => {
    const run = createRun(44);
    const before = withBattle(run, (state) => {
      const battle = state.battle!;
      battle.playerBoard = [
        { instanceId: "player-target", cardId: "crypt-guard", owner: "player", attack: 2, health: 3, maxHealth: 3, summonedTurn: 0, hasAttacked: false },
      ];
      battle.enemyBoard = [
        { instanceId: "enemy-minion", cardId: "bone-rat", owner: "enemy", attack: 1, health: 1, maxHealth: 1, summonedTurn: 0, hasAttacked: false },
      ];
    });
    const after = withBattle(before, (state) => {
      state.battle!.enemyTurnEvents = [
        { type: "play-minion", cardId: "cinder-imp", instanceId: "secret-card", handSlot: 1, summonedIds: ["enemy-minion"] },
        { type: "cast-spell", cardId: "soul-lance", instanceId: "enemy-lance", handSlot: 0, effects: [{ kind: "damage", targetId: "player-target" }] },
        { type: "boss-area", damage: 1, targetMinionIds: ["player-target"], targetHeroId: "player" },
        { type: "attack", cardId: "bone-rat", attackerId: "enemy-minion", targetId: "player-target" },
      ];
      state.battle!.playerBoard[0]!.health = 1;
    });
    const events = collectCombatEffectEvents(before, after, { type: "end-turn" }, 30);
    expect(events.map((event) => event.effectKind)).toEqual(["summon", "damage", "impact", "attack", "attack"]);
    expect(events[0]).toMatchObject({ assetCardId: "cinder-imp", source: { kind: "hand", side: "enemy", slot: 1, instanceId: "secret-card" }, target: { kind: "minion", side: "enemy", slot: 0 } });
    expect(events[1]).toMatchObject({ assetCardId: "soul-lance", source: { kind: "hand", side: "enemy", slot: 0 }, target: { kind: "minion", side: "player", slot: 0 }, soundCues: ["spell", "damage"] });
    expect(events[1]?.damageTarget).toBe("minion");
    expect(events[2]).toMatchObject({ areaImpact: true, bossArea: true, bossPhase: 1, effectKind: "impact", soundCues: ["damage"], affectedTargets: [
      { target: { kind: "minion", side: "player", slot: 0 }, damage: { amount: 1, armorBlocked: 0, outcome: "hit", retaliation: false } },
      { target: { kind: "hero", side: "player" }, damage: { amount: 1, armorBlocked: 0, outcome: "hit", retaliation: false } },
    ] });
    expect(events[2]).not.toHaveProperty("damageTarget");
    expect(events[3]).toMatchObject({ assetCardId: "bone-rat", source: { kind: "minion", side: "enemy", slot: 0 }, target: { kind: "minion", side: "player", slot: 0 } });
    expect(events[4]).toMatchObject({ assetCardId: "crypt-guard", source: { kind: "minion", side: "player", slot: 0 }, target: { kind: "minion", side: "enemy", slot: 0 } });
    expect(events[3]?.damageTarget).toBe("minion");
    expect(events[4]?.damageTarget).toBe("minion");
  });

  it("does not create an area impact when the enemy turn has no boss-area record", () => {
    const run = createRun(45);
    const before = withBattle(run, (state) => { state.battle!.enemyId = "boss-grave-king"; });
    const after = withBattle(before, (state) => { state.battle!.turnNumber += 1; });
    expect(collectCombatEffectEvents(before, after, { type: "end-turn" }, 1)).toEqual([]);
  });

  it("marks every player minion killed by the boss area strike for the death effect", () => {
    const run = createRun(46);
    const before = withBattle(run, (state) => {
      state.battle!.enemyId = "boss-grave-king";
      state.battle!.playerBoard = [0, 1].map((index) => ({ instanceId: `fragile-${index}`, cardId: "bone-rat", owner: "player" as const, attack: 1, health: 1, maxHealth: 1, summonedTurn: 0, hasAttacked: false }));
    });
    const after = withBattle(before, (state) => {
      state.battle!.playerBoard = [];
      state.battle!.enemyTurnEvents = [{ type: "boss-area", damage: 1, targetMinionIds: ["fragile-0", "fragile-1"], targetHeroId: "player" }];
    });

    expect(collectCombatEffectEvents(before, after, { type: "end-turn" }, 100)[0]).toMatchObject({
      bossArea: true,
      areaImpact: true,
      soundCues: ["damage", "death"],
      deathAnchors: [{ kind: "minion", side: "player", slot: 0 }, { kind: "minion", side: "player", slot: 1 }],
    });
  });
});
