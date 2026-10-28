# Task: T01 Mark Damage Targets

## Status: done

## Goal
Tag direct damage effect events with the kind of anchor that was hit, so the rendering layer can show blood on minions and a red flash on heroes without guessing from card IDs or sound cues.

## Decision Summary
- Cover player and enemy minion attacks symmetrically. Keep hero attacks out of scope.
- Use a shared attack style with the card's existing visual theme; direct minion damage gets blood feedback and direct hero damage gets red flash feedback.
- Boss area attacks keep their existing area effect and shake; this task tags direct hit events and does not fan one area event into per-unit events.

## Implementation

### I01. Add explicit damage-target metadata

- Related Files:
  - `apps/web/src/game/combatEffects.ts` :: `CombatEffectEvent`, `pushEvent`, `collectEnemyTurnEvents`, `collectCombatEffectEvents`; modify

#### Details
- **Signatures & Types**:
  ```typescript
  export type CombatDamageTarget = "minion" | "hero";

  export interface CombatEffectEvent {
    id: number;
    assetCardId: string | null;
    effectKind: CombatEffectKind;
    soundCues: SoundEffectKind[];
    source: CombatAnchor;
    target: CombatAnchor;
    damageTarget?: CombatDamageTarget;
    areaImpact?: boolean;
    bossArea?: boolean;
    deathAnchors?: CombatAnchor[];
  }

  function pushEvent(
    events: CombatEffectEvent[],
    firstEventId: number,
    assetCardId: string | null,
    effectKind: CombatEffectKind,
    source: CombatAnchor,
    target: CombatAnchor,
    soundCues?: SoundEffectKind[],
    areaImpact?: boolean,
    deathAnchors?: CombatAnchor[],
    bossArea?: boolean,
    damageTarget?: CombatDamageTarget,
  ): void;
  ```
- Keep `damageTarget` optional and omit the property for non-damage events. Add it as the final `pushEvent` parameter so existing positional arguments retain their meaning.
- Set `damageTarget` from the resolved `target.kind` for direct damage events:
  1. Enemy combat-record minion attacks, including the defender's reciprocal damage event when the target is a minion.
  2. Player minion attacks and each eligible `all-attack` minion event.
  3. Player and enemy direct `damage`, `randomDamage`, and `cleave` spell effects after their target anchor is resolved.
  4. The Assassin hero power's direct damage target and the end-turn fallback hero impact when the player's health decreased.
- Do not set `damageTarget` for summon, heal, buff, draw, mana, fusion, or other non-damaging events. Leave the existing boss `areaImpact`/`bossArea` event shape and behavior intact.
- **Execution flow**: resolve source and target as today; when the event represents direct damage, map `target.kind === "minion"` to `"minion"` and `target.kind === "hero"` to `"hero"`; pass that value to `pushEvent`; omit it for all other events.

### I02. Cover event metadata

- Related Files:
  - `apps/web/src/game/combatEffects.test.ts` :: `collectCombatEffectEvents` and `collectEnemyActionEffects` tests; modify

#### Details
- Update exact expected attack event objects to include `damageTarget` only for damage events.
- Add or extend cases to verify:
  - Both outgoing and reciprocal minion damage in enemy minion combat have `damageTarget: "minion"`.
  - Player and enemy minion attacks targeting a hero have `damageTarget: "hero"`.
  - Direct spell damage and the Assassin hero power classify their resolved minion or hero target.
  - Non-damage effects do not contain the optional field.
  - Boss area events remain marked `areaImpact` and `bossArea` without being split into individual direct-hit events.

## Acceptance Criteria
- [ ] Every covered direct damage event identifies whether its target anchor is a minion or hero.
- [ ] Non-damage events omit `damageTarget`.
- [ ] Existing event order, sound cues, death anchors, and boss area flags are preserved.

## Validation
- `npm test -- apps/web/src/game/combatEffects.test.ts`
- `npm run build`

## Commit Message
```text
feat(combat): tag direct damage targets

Plan: 2026-10-28-minion-attack-effects
Phase: P01-attack-and-hit-feedback
Task: T01-mark-damage-targets

- Add minion and hero damage target metadata to direct combat events
- Cover player, enemy, spell, and hero power damage classification
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
