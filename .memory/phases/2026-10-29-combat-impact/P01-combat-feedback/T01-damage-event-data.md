# Task: T01 Resolved Damage Event Data

## Status: done

## Goal
Give the web combat presentation layer an exact damage outcome for every target hit, including random damage rolls, armor absorption, overkill, retaliation, and boss phase. Do not persist presentation-only information or alter gameplay damage.

## Decision Summary
- Impact tier amount is incoming damage after armor absorption but before clamping a minion/hero to remaining health. Thus overkill counts; armor-absorbed damage does not.
- 1–2 is `light`, 3–4 is `medium`, 5+ is `heavy`. A zero random roll is `miss`. A positive hit fully absorbed by armor is `armor-block`.
- Minion retaliation is marked separately and always renders/plays at the light tier. Lethal hits additionally use the existing `death` cue.
- Boss-area damage carries phase 1, 2, or 3 and retains its special boss presentation.

## Implementation

### I01. Add typed per-target damage metadata to combat presentation events
- Related Files:
  - `apps/web/src/game/combatEffects.ts` :: `CombatEffectEvent`, `collectEnemyTurnEvents`, `collectEnemyActionEffects`, `collectCombatEffectEvents`, and event creation helpers; modify
  - `apps/web/src/game/gameActions.ts` :: `sessionForAction` and `reduceGameAction`; modify to pass the ephemeral spell-resolution log into event collection
  - `packages/game-core/src/engine.ts` :: `applySpellEffect`, `castSpell`, and new `castSpellWithResolution`; modify/add
  - `packages/game-core/src/types.ts` :: expose transient result types only if needed by the game-core public API; modify if required
  - `apps/web/src/game/combatEffects.test.ts` :: event metadata coverage; modify
  - `apps/web/src/game/gameActions.test.ts` :: reducer integration coverage; modify
  - `packages/game-core/src/engine.test.ts` :: resolved spell damage coverage; modify

#### Details
- **Signatures & Types**:
  ```typescript
  export type CombatDamageOutcome = "hit" | "miss" | "armor-block";

  export interface CombatDamageInfo {
    /** Damage reaching health after armor absorption, before clamping at zero health. */
    amount: number;
    /** Positive amount absorbed by hero armor; always 0 for minions. */
    armorBlocked: number;
    outcome: CombatDamageOutcome;
    /** True only for the defender-to-attacker return event in minion combat. */
    retaliation: boolean;
  }

  export interface CombatTargetDamage {
    target: CombatAnchor;
    damage: CombatDamageInfo;
  }

  export interface CombatEffectEvent {
    // Keep current fields and add:
    damage?: CombatDamageInfo;
    /** Independent victim results for one multi-target presentation event, such as cleave or boss area. */
    affectedTargets?: CombatTargetDamage[];
    bossPhase?: 1 | 2 | 3;
  }

  export interface ResolvedSpellEffect {
    effectIndex: number;
    kind: SpellEffect["kind"];
    targetId: string | null;
    amount?: number;
  }

  export interface SpellCastResolution {
    run: RunState;
    effects: ResolvedSpellEffect[];
  }

  export function castSpellWithResolution(
    run: RunState,
    handInstanceId: string,
    targetId?: string,
  ): SpellCastResolution;
  ```
- **Data & Schema Fields**:
  - `CombatEffectEvent.damage` is present only for an event that attempts damage. `amount` is after armor and before target-health clamping; it may exceed remaining health, but is never negative. `armorBlocked` records armor absorption.
  - `outcome` is `miss` when a resolved random-damage amount is 0; `armor-block` when positive attempted damage is fully absorbed by armor; otherwise `hit` when `amount > 0`.
  - `retaliation` marks the defender-to-attacker event in a minion-vs-minion exchange. The original attacker-to-defender event remains a normal hit.
  - `bossPhase` is copied from `RunState.phase` on boss-area events and omitted from other events.
  - A cleave or boss-area effect remains one presentation event. Store an independent result for every affected target in `affectedTargets`; include armor absorption for the hero. The boss warning/cast/impact sequence must play once, not once per victim.
  - `ResolvedSpellEffect` is transient return data. Do not add the spell-resolution log to `RunState`, `BattleState`, saves, local storage, or API DTOs.
- **Execution Flow / Logic**:
  1. Add `castSpellWithResolution`; preserve `castSpell(run, handInstanceId, targetId?): RunState` as a compatibility wrapper returning `.run`. While applying spell effects, capture `effectIndex`, `kind`, `targetId`, and the existing `resolved.amount` value. This captures the actual random roll even when its target dies or takes overkill damage.
  2. In `gameActions.ts`, use `castSpellWithResolution` only for the `cast-spell` action. Pass the returned log into `sessionForAction` and `collectCombatEffectEvents`; discard it immediately after events are created.
  3. For fixed damage and cleave, record the effect amount separately for each target. For random damage, use the captured roll. For assassin hero power and direct minion attacks, use the damage attempted by that ability/attacker. Keep the two existing directional events for enemy minion combat and add the missing defender-to-attacker event for player minion combat; assign each event the corresponding attack value and mark only the return event as retaliation.
  4. For player-hero damage, calculate `armorBlocked = before.playerArmor - after.playerArmor` for that hit, then `amount = max(0, attemptedAmount - armorBlocked)`. Do not clamp `amount` to remaining health. Enemy hero attacks have `armorBlocked = 0` unless a future enemy armor rule is explicitly added.
  5. For enemy spell records, use `EnemyCombatRecord.effects[].amount`. For boss-area records, create one `affectedTargets` result per affected minion and hero, use damage `1` per target, calculate the hero's armor block, and set `bossPhase`.
  6. For player/enemy minion targets, record full attack/effect damage before the target health clamp. Ensure all events retain current playback order and event IDs.
  7. Distinguish a zero random result (`miss`) from positive damage fully absorbed by armor (`armor-block`). Neither is a `hit` event. Keep existing `spell` cast cue for a miss.
  8. Presentation metadata must never cause a legal action to fail, affect game-state results, or persist beyond the current combat animation.
- **Required Cases**:
  - Boundary mapping input amounts later consumed by UI: 1, 2, 3, 4, 5.
  - Overkill retains full post-armor damage even when target health reaches zero.
  - Armor absorption records amount and blocked damage, including a full block.
  - Random 0 records `miss`; random 1–5 records its exact amount, including a lethal roll.
  - Cleave produces one event amount per affected target; never sum its damage.
  - Minion combat produces a normal hit and a separately marked retaliation event.
  - Boss-area events carry the active phase and the fixed per-victim damage.
  - Existing `castSpell` callers still receive `RunState`; persisted run shape is unchanged.

### I02. Verify event data and compatibility
- Related Files:
  - `packages/game-core/src/engine.test.ts` :: `castSpell` and `castSpellWithResolution` behavior; modify
  - `apps/web/src/game/combatEffects.test.ts` :: player/enemy event metadata; modify
  - `apps/web/src/game/gameActions.test.ts` :: resolved random damage passed into events; modify
#### Details
- Use fixed seeds to assert the captured random amount equals the engine's outcome, including a lethal hit.
- Assert armor-block and miss have different outcomes and no persisted schema changes.
- Assert per-target cleave and overkill amounts are not clamped or summed.
- Assert existing callers retain the `castSpell` return type and result.

## Acceptance Criteria
- [ ] Player/enemy attacks, damage spells, damage class abilities, and boss area actions provide exact per-target damage metadata.
- [ ] Armor absorption, overkill, random zero, retaliation, and boss phase are represented unambiguously.
- [ ] No presentation-only data is persisted; gameplay damage and armor results are unchanged.
- [ ] Targeted existing tests pass.

## Validation
- `npm.cmd test -- packages/game-core/src/engine.test.ts apps/web/src/game/combatEffects.test.ts apps/web/src/game/gameActions.test.ts` — run after implementation.
- `npm.cmd run build` — run after implementation.

## Commit Message
```text
feat(game): expose resolved damage for combat feedback

Plan: 2026-10-29-combat-impact
Phase: P01-combat-feedback
Task: T01-damage-event-data

- Pass per-target resolved damage and armor outcomes to combat presentation
- Preserve compatibility and keep presentation data out of saved runs
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending

