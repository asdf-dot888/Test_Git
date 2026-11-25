# Task: T01 Engine Hero Power Cooldown

## Status: done

## Goal
After the player uses the hero power, the engine refuses it for the player's next 2 turns and allows it again on the turn after (used on turn 3, refused on turns 4 and 5, allowed on turn 6). Old saves load with the hero power ready. This is the rule every other task builds on.

## Decision Summary
- D01: cooldown of 2 player turns, counted in the player's own turns, same for all classes; mana cost 2 and the Demonist's 2 soul shards stay.
- D02: no cooldown at battle start (ready from turn 1; turn 1 has only 1 mana anyway).

## Implementation

### I01. Battle state field and constant
- Related Files:
  - `packages/game-core/src/types.ts` :: `BattleState` — add the field; modify
  - `packages/game-core/src/engine.ts` :: constants block near `SOUL_SHARD_HERO_POWER_COST` (line ~37), `gameConstants` (line ~1797) — modify

#### Details
- **Signatures & Types**:
  ```typescript
  // types.ts, BattleState, directly after `heroPowerUsed: boolean;`
  /** Player turns the hero power still has to rest after its last use; 0 = ready. Missing in old saves (treated as 0). */
  heroPowerCooldown: number;

  // engine.ts, next to SOUL_SHARD_HERO_POWER_COST
  /** After a use, the hero power rests for this many of the player's own turns. */
  const HERO_POWER_COOLDOWN_TURNS = 2;

  // gameConstants: add
  heroPowerCooldownTurns: HERO_POWER_COOLDOWN_TURNS,
  ```
- **Data & Schema Fields**:
  - `BattleState.heroPowerCooldown`: integer >= 0, default 0, not nullable in the type (hydration fills it).
  - `heroPowerUsed` stays as it is (true only during the turn of use). Web code and the bot already read it.

### I02. Rules
- Related Files:
  - `packages/game-core/src/engine.ts` :: `useHeroPower` (~line 1449), `startPlayerTurn` (~line 664), `beginEncounter` (battle literal ~line 1335), `hydrateRunForCurrentBattle` (~line 195) — modify

#### Details
- **Execution Flow / Logic**:
  1. `beginEncounter`: battle literal gets `heroPowerCooldown: 0` next to `heroPowerUsed: false`.
  2. `useHeroPower`: right after the existing `if (battle.heroPowerUsed) fail(...)` add
     `if (battle.heroPowerCooldown > 0) fail("INVALID_ACTION", \`The hero power is recharging for ${battle.heroPowerCooldown} more turn(s).\`);`
     Keep all other checks in their current order. Where it sets `battle.heroPowerUsed = true;` also set `battle.heroPowerCooldown = HERO_POWER_COOLDOWN_TURNS;`.
  3. `startPlayerTurn`: replace `battle.heroPowerUsed = false;` with
     ```typescript
     // The turn of use does not count; every later player turn takes one off the rest.
     if (battle.heroPowerCooldown > 0 && !battle.heroPowerUsed) battle.heroPowerCooldown -= 1;
     battle.heroPowerUsed = false;
     ```
     Trace that must hold: use on turn 3 → cooldown 2, used true. Turn 4 start: used was true → no decrement, cooldown 2 (locked). Turn 5 start: → 1 (locked). Turn 6 start: → 0 (ready).
     Note: `startPlayerTurn(run, false)` is also called for the player's first turn from `dealTurnOrder`; cooldown is 0 there, so nothing changes.
  4. `hydrateRunForCurrentBattle`: add `Number.isInteger(battle.heroPowerCooldown)` to the `hasClassResources` check and `current.heroPowerCooldown ??= 0;` next to `current.heroPowerUsed ??= false;`.
  5. Error handling: only the new `fail("INVALID_ACTION", ...)`; no other error paths.

### I03. API save schema
- Related Files:
  - `apps/api/src/routes/runRoutes.ts` :: `battleSchema` — modify
  - `apps/api/src/routes/runRoutes.test.ts` — modify

#### Details
- Add `heroPowerCooldown: z.number().int().min(0).max(10).optional(),` next to `playerFatigue` in `battleSchema` (z.object strips unknown keys, so without it the field would be lost on a server round trip).
- Add a test next to "keeps the fatigue counters of a battle through a save" (line ~258): a saved run with `battle.heroPowerCooldown = 2` comes back with 2.
- Note: `heroPowerUsed`, `playerArmor` and `soulShards` are not in this schema today (existing gap, reported in the plan close-out; do not add them here).

### I04. Engine tests
- Related Files:
  - `packages/game-core/src/engine.test.ts` — modify (near the existing hero power tests, ~line 650-680)

#### Details
- Warrior: give turn mana >= 2 (use the existing helpers that the hero power tests use), use the hero power on turn N → `heroPowerCooldown === 2`; end turn and run the enemy turn so it is turn N+1 → `useHeroPower` throws `INVALID_ACTION`; turn N+2 → still throws; turn N+3 → succeeds.
- Cooldown at battle start is 0 (`createRun(...)` battle) and after `advanceRun` to a new battle it is 0 again (new battle literal).
- Hydration: delete `heroPowerCooldown` from a saved active battle → `hydrateRunForCurrentBattle` sets 0 (extend the existing "old battle" test at ~line 670 that already deletes `heroPowerUsed`).
- `gameConstants.heroPowerCooldownTurns === 2`.
- If the 11 golden enemy-turn hashes change (they should not, the enemy has no hero power), find out why before re-capturing.

## Acceptance Criteria
- [x] Used on turn N: refused on N+1 and N+2, allowed on N+3; refused message names the remaining turns.
- [x] New battles and hydrated old saves start with `heroPowerCooldown = 0`.
- [x] The API keeps `heroPowerCooldown` through a save.
- [x] All existing tests pass; golden hashes unchanged.

## Validation
- `export PATH="$HOME/.local/node-v24.22.3-darwin-arm64/bin:$PATH"; npm test` — all test files pass (104+ files).
- `npm run lint` and `npx tsc -p packages/game-core --noEmit` and `npx tsc -p apps/web --noEmit` — no errors (web compiles against the new required field; fix any test fixture that builds a `BattleState` literal by adding `heroPowerCooldown: 0`).

## Commit Message
```text
feat(core): give the hero power a two-turn cooldown

Plan: 2026-11-25-hero-power-cooldown-and-tutorial
Phase: P01-hero-power-cooldown
Task: T01-engine-cooldown

- BattleState.heroPowerCooldown: rests for the player's next 2 turns after a use; ready at battle start.
- useHeroPower refuses while recharging; startPlayerTurn counts the rest down (the turn of use does not count).
- Old saves hydrate with cooldown 0; the run API keeps the field.
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 (1264 tests / 104 files, lint, tsc for game-core, web and api; golden hashes unchanged)
- commit: see git log (feat(core): give the hero power a two-turn cooldown)
