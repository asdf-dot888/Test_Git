# Task: T02 Taunt Keyword and the New Attack Rules

## Status: done

## Goal
Add the taunt keyword to 10 cards and make attacks follow Hearthstone: with a taunt minion on the opposing board only taunt minions can be attacked; without one any minion or the hero can be attacked. The old rule "the hero can only be attacked when the opposing board is empty" disappears for both sides.

## Decision Summary
D03 (semantics), D04 (card list: imp-caller, pit-ritualist, shadow-duelist, demon-houndmaster, infernal-guardian, summoner, storm-crow, abyssal-matriarch, warrior-vanguard, warrior-stonewall) and the engine part of D05 (all-attack). Spells, hero powers and battlecries ignore taunt.

## Implementation
### I01. `packages/game-core/src/types.ts` and `catalog.ts`
- `CardDefinition.minion` gets `taunt?: boolean`. Add an exported helper `hasTaunt(minion: Pick<MinionState, "cardId">): boolean` (looks the card up; export it from `index.ts`) so the web can use it.
- Mark the 10 cards above with `taunt: true`. Find the real ids with `grep -n "imp-caller\|pit-ritualist\|shadow-duelist\|demon-houndmaster\|infernal-guardian\|demonist-summoner\|storm-crow\|abyssal-matriarch\|warrior-vanguard\|warrior-stonewall" packages/game-core/src/catalog.ts` (the ids in the decision file are the short names; catalog ids carry class prefixes such as `demonist-` / `assassin-`).
- Card descriptions: the minion description builder in `catalog.ts` prefixes `도발.` when `taunt` is set (for example `도발. 임프 1마리를 소환합니다.`). Update the tests that pin descriptions.
### I02. `packages/game-core/src/engine.ts`
- New `function legalAttackTargets(battle: BattleState, attackerSide: PlayerSide): { minions: MinionState[]; heroAllowed: boolean }`: opposing taunt minions only (hero not allowed) when any exist; otherwise all opposing minions and the hero.
- `attackWithMinion`: use it. Reject a target that is not legal with `INVALID_TARGET` and the message `도발 하수인을 먼저 공격해야 합니다.` (taunt case) or the existing messages. The hero can be attacked while enemy minions without taunt stand on the board.
- Enemy side: `isEnemyAttackReady` unchanged; `planEnemyAttacks` (beam search on `AttackSimState`) must carry a `taunt` flag per simulated minion and generate only legal (attacker, target) pairs; killing the last taunt minion opens the hero and the other minions in the simulation; `applySimAttack` keeps armor handling. The never-hold-back rule stays: only full-depth plans are candidates. `greedyEnemyAttackTarget` (first battle) chooses among legal targets only (taunt first; otherwise its old sort). `resolveEnemyMinionAttacks`: a planned hero attack is executed when legal (no taunt on the board); consecutive planned hero attacks of ≥ 2 attackers are still shown as one `all-attack` `EnemyCombatRecord`, a single hero attacker as `attack`; re-validate every step against `legalAttackTargets` and skip an illegal step.
- `attackAllReadyMinions`: keep exporting it for now; it attacks the hero with every ready minion only when the enemy board has no taunt (and no longer requires an empty board); otherwise `INVALID_TARGET`. P02-T01 deletes it.
- Do not change spell, hero power or boss area logic.
### I03. Tests (`engine.test.ts`)
- Player: with a taunt minion on the enemy board, attacking the hero or a non-taunt minion throws `INVALID_TARGET`, attacking the taunt works; after the taunt dies the hero and others are legal; a board of 3 non-taunt minions no longer blocks an attack on the hero; spells and the assassin hero power still target non-taunt minions and the hero.
- Enemy: the same legality for the enemy's attacks (planned and first-battle greedy); the enemy with 3 ready minions and no taunt on the player's side attacks the hero in one `all-attack` record when the plan hits the hero with all of them; a lone hero attack is an `attack` record; taunt makes the planner attack the taunt first.
- Property test "planned result never worse than greedy" is kept and generates boards with taunt flags.
- Catalog test: exactly the 10 listed cards have `taunt`; descriptions start with `도발.`.
- Re-capture golden hashes if they change and note it.

## Acceptance Criteria
- [ ] Legal-target rules match the decision for both sides; spells/hero powers ignore taunt.
- [ ] The 10 cards have taunt and the description shows it.
- [ ] Existing web tests still pass (the web UI is unchanged in this task); `npm run build`, `npm test`, `npm run lint` pass.

## Validation
- `npm run build`
- `npm test -- packages/game-core/src/engine.test.ts`
- `npm test`, `npm run lint`

## Commit Message
```text
feat(core): add taunt and let attackers reach the hero past non-taunt minions

Plan: 2026-11-24-hearthstone-rules-and-taunt
Phase: P01-engine-rules
Task: T02-taunt-and-attack-rules
```

## Progress
- [x] done. Taunt keyword: `CardDefinition.minion.taunt`, `TAUNT_CARD_IDS` (10 cards, descriptions start with 도발) in catalog.ts, exported `hasTaunt` and `getLegalAttackTargets`, `legalAttackTargets` used by attackWithMinion, attackAllReadyMinions (kept until P02-T01; now hits the hero unless taunt blocks), the enemy plan (taunt flag per simulated minion), the first-battle greedy choice (taunt first, lethal goes face) and `resolveEnemyMinionAttacks` (consecutive hero attackers grouped into one all-attack action). Tests added/updated (taunt describe, attack planning cases use a taunt blocker). The property 'planned never worse than greedy' test is unchanged (boards without taunt). 1220 tests (101 files), lint and build pass.
- commit: see Git history
