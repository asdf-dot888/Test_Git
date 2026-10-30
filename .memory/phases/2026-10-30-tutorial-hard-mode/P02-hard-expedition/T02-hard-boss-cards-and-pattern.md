# Task: T02 Hard Boss Cards and Pattern

## Status: done

## Goal

Give each of the three existing bosses three distinct Hard-mode cards and resolve a prominently announced area attack every second boss turn in Hard mode, without changing Normal-mode boss behavior.

## Decision Summary

- Bosses: `boss-blood-matron`, `boss-grave-king`, and `boss-void-titan`.
- Add one copy of each boss's three unique cards to that boss's generated 30-card deck; do not add them to player rewards or Normal-mode enemy decks.
- Hard area attack cadence is every 2 turns; keep the existing 1 damage to the player hero and all player minions. Normal remains every 3 turns.

## Implementation

### I01. Define boss-locked cards and required status effects

- Related Files:
  - `packages/game-core/src/types.ts` :: `SpellEffect`, `MinionState`, `EnemyCombatRecord`; modify
  - `packages/game-core/src/catalog.ts` :: `describeSpellEffects`, card factories, `CARD_CATALOG`, `CARD_BY_ID`; modify
  - `packages/game-core/src/engine.ts` :: `enemyCardWeight`, `createEnemyDeck`, `applySpellEffect`, `selectEnemySpellTarget`, `isEnemyCardTargetPlayable`, `isEnemyCardPlayable`, `scoreEnemyCard`, `startPlayerTurn`, `endPlayerTurnWithPlayback`, `removeDeadMinions`, `rewardChoices`; modify
  - `packages/game-core/src/engine.test.ts` :: hard boss deck composition and status resolution; modify
  - `apps/api/src/routes/runRoutes.ts` :: `minionSchema`, `runSchema`; modify

#### Details

- **Data & Schema Fields**:
  - Add optional card fields `enemyOnly?: boolean` and `bossId?: string`; each boss-only card sets `enemyOnly: true`, `rewardTier: "boss"`, and exactly one matching `bossId`. Exclude `enemyOnly` from player reward candidates.
  - Add `CombatStatusEffect = { kind: "root"; turnsRemaining: number } | { kind: "burn"; turnsRemaining: number; amount: number } | { kind: "curse"; turnsRemaining: number; attackReduction: number }`. Add optional `statusEffects?: CombatStatusEffect[]` to both `HeroState` and `MinionState`; `root` prevents a minion attack, `burn` deals `amount` damage at the start of the affected side's turn, and `curse` temporarily reduces minion attack by `attackReduction`.
  - Add spell-effect variants:
    - `{ kind: "rootMinion"; target: "enemyMinion"; turns: 1 }`
    - `{ kind: "curseAllEnemyMinions"; attackReduction: 2; turns: 1 }`
    - `{ kind: "burnEnemyHero"; damagePerTurn: 2; turns: 2 }`
    - `{ kind: "damageAllEnemyMinions"; amount: 4 }`
    - `{ kind: "soulHarvest"; damage: 5; heal: 5 }` (when the player has a board, damage its highest-attack minion and heal the casting boss hero; otherwise damage the player hero and heal the boss hero)
  - Keep absent `statusEffects` valid for legacy saved heroes and minions. API validation caps `turnsRemaining` at 3, burn `amount` at 20, and curse `attackReduction` at 20.
- **Boss card definitions**:
  - Phase 1, `boss-blood-matron`:
    1. `matron-thorn-prison`, “가시 감옥”, spell cost 3, target the highest-attack player minion and root it for 1 player turn.
    2. `matron-wither-curse`, “시드는 저주”, spell cost 4, reduce every player minion's attack by 2 for 1 player turn.
    3. `matron-briar-guardian`, “가시숲의 수호자”, minion cost 6, stats 5/7, boss-only; reuse existing battlecry summon by adding a new neutral token `matron-thornling` 1/1 and summon 2 copies.
  - Phase 2, `boss-grave-king`:
    1. `grave-king-soul-tithe`, “영혼 십일조”, spell cost 1, discard a random enemy-hand card, gain 3 temporary mana, then summon one `grave-king-demon` 4/4 token.
    2. `grave-king-pit-gate`, “심연의 문”, spell cost 6, summon two `grave-king-demon` 4/4 tokens.
    3. `grave-king-harvest`, “군주의 수확”, spell cost 5, use `soulHarvest`: deal 5 damage to the player hero when no player minion is available; otherwise deal 5 to the highest-attack player minion; heal the boss hero for 5 in either case.
  - Phase 3, `boss-void-titan`:
    1. `void-titan-burning-mark`, “용의 낙인”, spell cost 3, apply 2 burn to the player hero at each of the next 2 player-turn starts.
    2. `void-titan-inferno`, “화염 숨결”, spell cost 6, deal 4 damage to all player minions.
    3. `void-titan-flame-legion`, “화염군단”, spell cost 7, summon two `void-titan-whelp` 3/3 tokens.
  - All token definitions use `tokenOnly: true`, have explicit IDs, and are not eligible for generated decks or rewards. Reuse these existing card art keys so every new card resolves to an existing `/art/cards/{artKey}.png`: `matron-thorn-prison` → `thorn-brute`; `matron-wither-curse` → `plague-bearer`; `matron-briar-guardian` → `ancient-treant`; `grave-king-soul-tithe` → `soul-bargain`; `grave-king-pit-gate` → `demonist-abyss-lord`; `grave-king-harvest` → `demonist-hellfire`; `void-titan-burning-mark` → `meteor-shard`; `void-titan-inferno` → `eclipse`; `void-titan-flame-legion` → `storm-crow`.
- **Execution Flow / Logic**:
  1. Change `createEnemyDeck(enemy, seed, idPrefix)` to receive `difficulty`. Filter boss-only cards into its explicit seed list only when `difficulty === "hard"` and `card.bossId === enemy.id`; retain the 30-card deck size and two-copy limit for all other cards.
  2. Include one copy each of the matching three boss cards, then fill remaining slots with the existing weighted neutral pool and shuffle with the battle RNG.
  3. Make boss-specific cards playable by the boss and impossible for player rewards, other bosses, and normal enemies to receive.
  4. Make `selectEnemySpellTarget` pick the highest-attack player minion for `rootMinion` and `soulHarvest`. Make `isEnemyCardTargetPlayable` require at least one player minion for root/curse effects and make area damage and hero burn targetless. Special-case only the existing `soul-bargain` follow-up condition in `isEnemyCardPlayable`; `grave-king-soul-tithe` can be cast with an empty remaining hand.
  5. Add Hard AI scores for the new effects: root + `20 + target.attack`; curse + `12` per player minion affected; burn + `damagePerTurn * turns`; damage-all + `18` per player minion killed and `5` per minion damaged; soul harvest + `30` for a minion kill or `20 + damage` against the hero, then add expected healing up to missing boss health.
  6. Apply root/curse/burn effects deterministically, with effect records sufficient for the existing enemy-intent playback. Rooted minions cannot attack. Burn ticks at the start of the affected side's turn, before that side acts, and decrements its duration then. Root and curse remain active through the affected player's next turn and decrement when that player's turn ends; restore the stored `attackReduction` when curse expires. If burn reduces the hero to 0, resolve defeat before further turn actions.
  7. Resolve summon effects through the existing six-minion field limit; if a board is full, summon only the number of tokens that fit.
  8. Add status indicators and accessible explanations to `apps/web/src/components/MinionCard.tsx` for rooted, burning, and cursed minions; do not change card stats or attack availability on the client independently of the engine state.

### I02. Add difficulty-aware area attack cadence and warning playback

- Related Files:
  - `packages/game-core/src/engine.ts` :: `resolveBossAreaAttack`, `resolveEnemyTurnWithPlayback`; modify
  - `packages/game-core/src/types.ts` :: `EnemyCombatRecord`; modify
  - `apps/web/src/components/EnemyIntentPreview.tsx` :: `boss-area` warning rendering; modify
  - `apps/web/src/App.tsx` :: enemy-turn playback selection; modify only if needed
  - `packages/game-core/src/engine.test.ts` :: Normal/Hard cadence and damage; modify
  - `apps/web/src/App.enemy-turn-playback.test.tsx` :: prominent area warning; modify

#### Details

- Keep `EnemyCombatRecord` area payload damage at exactly `1`, target all living player minions and the player hero, and emit one area event per scheduled attack.
- In `resolveEnemyTurnWithPlayback`, schedule the attack if `enemy.kind === "boss"` and either (`difficulty === "normal"` and the current condition `turnNumber % 3 === 0`) or (`difficulty === "hard"` and `turnNumber % 2 === 0`).
- Before resolving damage, show a prominent, screen-readable “보스가 공격합니다” warning in enemy intent playback. Do not reveal target-by-target details or damage amount in this warning.
- Maintain event order: boss card plays and minion attacks first, then the announced boss area attack, then the player turn starts.

## Acceptance Criteria

- [ ] Each Hard-mode boss deck has exactly its three boss-specific card IDs, one copy each; no other enemy deck contains them.
- [ ] Tokens are never drafted, rewarded, or generated as ordinary enemy cards.
- [ ] Root, curse, burn, hero damage, minion damage, and summons resolve and expire exactly as described.
- [ ] Hard boss area attacks occur on turns divisible by 2; Normal remains on the old turns divisible by 3; each scheduled attack deals 1 to all living player minions and the player hero.
- [ ] Enemy playback shows “보스가 공격합니다” before area damage without disclosing details.

## Validation

- `npm run test --workspace @board-game/game-core -- src/engine.test.ts`
- `npm run test --workspace @board-game/web -- src/App.enemy-turn-playback.test.tsx`
- `npm run test --workspace @board-game/api -- src/routes/runRoutes.test.ts`
- `npm run build`

## Commit Message

```text
feat(game): add hard-mode boss cards and area attacks

Plan: 2026-10-30-tutorial-hard-mode
Phase: P02-hard-expedition
Task: T02-hard-boss-cards-and-pattern

- Add phase-themed boss-only cards and temporary combat statuses
- Announce boss attacks and use a two-turn hard-mode cadence
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: pending
