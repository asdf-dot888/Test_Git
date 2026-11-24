# Plan: Playtest Feedback Round (UI, sound, mana, difficulty)

- Date: 2026-11-24
- Decisions: [2026-11-24-playtest-feedback-round](../decisions/2026-11-24-playtest-feedback-round.md)
- Status: planned (no task started)
- Shell setup for every validation command: `export PATH="$HOME/.local/node-v24.22.3-darwin-arm64/bin:$PATH"` and run from the repository root `/Users/gimjinhyeon/Downloads/Mango_Stone`.

## Goal
Apply the user's playtest feedback (10 items) in five phases: clearer battle layout and turn state, damage/heal numbers and a softer hover sound, faster player mana and two Mana Springs, a fairer and smarter enemy (no extra enemy minion health, more enemy mana, better attack planning) tuned with the balance simulation, and a close-out.

## Correction to the interview (found while planning)
During the interview Claude said the enemy on normal difficulty never attacks the hero when it could. That was wrong. In this game a side cannot attack the opposing hero while the opposing board has minions (player: `enemyHeroTargetable` needs `enemyBoard.length === 0`; enemy: `resolveEnemyMinionAttacks` falls back to the hero only when `playerBoard` is empty), and both difficulties already hit the hero when the player board is empty. So "attack the hero when lethal" needs no work. The real gaps are: the order of attackers, bad trades (a cheap kill that loses a valuable minion), and never skipping an attack to keep a blocker. D09.4 in the decision file is implemented as **attack planning** (P04-T02) instead.

## Additional finding (found while planning): a probable bug behind "the enemy sometimes plays no card"
Besides the enemy's low mana (fixed in P04-T01), `planEnemyTurn` starts from an empty plan with score 0 and only replaces it with a plan whose score is strictly above 0. The score subtracts the value of the player's minions, so when the player's board is much stronger every candidate can score 0 or less, the plan stays `[]`, and the enemy plays nothing even with mana and playable cards (battle 2 and later). It is read from the code, not yet reproduced; P04-T03 starts with a failing test and then fixes it. This extends decision D07 (not a design change).

## Current state (verified in code)
- `GameBoard.tsx`: the all-attack button sits in `div.field-action-bar` at the top of `section.battle-board`; `div.turn-controls-spacer` in `footer.player-controls > .player-toolbar` holds `TurnControls` (status text `내 턴`, hidden on mobile via `.turn-controls-spacer .turn-status`, and `button.end-turn-button`). `HeroPanel.tsx` renders portrait, details and the hero power.
- `App.tsx` computes `activeTurnId` only for the player's turn (`!playback && activeSide === "player"`), shows `TurnStartGlow` (1 s edge glow) and plays the `turn-start` sound at player turn starts. The enemy turn is shown through `session.enemyTurnPlayback`; `GameBoard` receives only `isResolving`.
- `useTurnTimer.ts`: `TURN_DURATION_MS = 20_000`; `App.tsx` formats `00:SS` and plays `timer-warning` for the last 5 seconds.
- `combatEffects.ts` builds `CombatEffectEvent`s with `damage?: CombatDamageInfo` (`amount`, `armorBlocked`, `outcome`, `retaliation`) and `affectedTargets` for area damage; `CombatEffectLayer.tsx` renders impact, shake, blood splatter, miss and armor-block marks. No numbers are rendered. Heal events carry no amount.
- `audio.ts`: `playHoverCue` synthesizes two triangle notes (1046.5 Hz, 1568 Hz) and tracks them in `hoverCues`; `audio.test.ts` has the hover tests; `dev/EffectsPreview.tsx` is the preview page.
- Engine (`packages/game-core/src/engine.ts`): `INITIAL_MANA = 5`, `MAX_MANA = 10`; `startPlayerTurn` recovers `turnNumber <= 3 ? 1 : <= 6 ? 2 : 3`; the enemy recovers `+1` per turn after turn 1 (`resolveEnemyTurnWithPlayback`); `ENEMY_PHASE_BONUS` (`heroHealth`, `minionAttack`, `minionHealth` per phase) applies from the second battle; `resolveBossAreaAttack` runs on turns `% 3 === 0` (normal) or even turns (hard); `resolveEnemyMinionAttacks` picks targets greedily; `planEnemyTurn` is a beam search over card order.
- Starter deck = `SHARED_STARTER_CARD_IDS` (20 cards, one `mana-spring`) + class cards (10); `STARTER_DECK_CARD_IDS` is a legacy 30-card list still covered by tests.
- Texts that state the numbers: `GameGuideModal.tsx` (mana line), `apps/web/public/game-architecture.html` (mana card), `GameBoard.tsx` (boss panel), README difficulty section.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | All-attack and end-turn button positions (PC and mobile), turn badge, board border and turn banner, 30-second timer, boss panel text | [P01](../phases/2026-11-24-playtest-feedback-round/P01-battle-layout-and-turn-clarity/phase.md) |
| P02 | `done` | Floating damage and heal numbers for every source, card rustle hover sound with preview | [P02](../phases/2026-11-24-playtest-feedback-round/P02-combat-feedback/phase.md) |
| P03 | `todo` | Player mana recovery 2/3/4 and two Mana Springs in the starter deck | [P03](../phases/2026-11-24-playtest-feedback-round/P03-mana-and-starter-deck/phase.md) |
| P04 | `todo` | Enemy minion health bonus removed, enemy mana +2, attack planning, mana-efficient card plans, balance tuning with the simulation | [P04](../phases/2026-11-24-playtest-feedback-round/P04-enemy-difficulty/phase.md) |
| P05 | `todo` | Guide and docs, phone checklist addendum, full audit and close-out | [P05](../phases/2026-11-24-playtest-feedback-round/P05-close-out/phase.md) |

## Risks
- P04 needs many simulation runs (about 0.15 s per run; 500 runs x 3 classes x 2 difficulties is several minutes, more with the new AI). Mitigation: iterate with 200-300 runs, confirm the final numbers with 500+ (README advice), keep every report under `docs/balance/`.
- Faster player mana (P03) makes the game easier and the targets (normal 55-65%, hard 6-10%, class gap <= 5 points) may need big enemy changes. Mitigation: the tuning knobs in D09 (enemy minion attack bonus, hero health bonus, AI search width and weights, enemy mana bonus). If the targets cannot be met within the decided design, stop and ask the user instead of silently changing the design.
- Layout work cannot be verified visually here. Mitigation: jsdom tests for structure, a `matchMedia` mock for the compact layout, and a phone/PC checklist in P05-T01; the user checks it.
- The hover sound cannot be heard by Claude. Mitigation: the preview button and tunable constants; the user decides.
- Many existing tests pin the old numbers (mana 1/2/3, minion health bonus, 20 s timer, hover notes). Each task lists the tests to update; do not weaken unrelated assertions.
- The working tree has unrelated untracked files (see `current.md`): commit by explicit file path only.
