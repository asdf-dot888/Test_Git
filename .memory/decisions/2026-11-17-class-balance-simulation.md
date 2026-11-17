# Decisions: Class/Card/Enemy Balance via Simulation Bot

- Date: 2026-11-17
- Status: Confirmed
- Scope: Measure class win rates with a headless simulation bot, then tune numeric values so the three classes are balanced. No new content, no card additions or removals.

## D01. Direction
- **Chosen**: Improve and balance existing features (not new content, not backend/save systems).
- **Chosen**: Focus area is card / class / enemy balance. UI/UX, presentation, and bug fixing are out of scope.
- **Rationale**: The user could not name a specific balance complaint, so the work is data-driven: measure first, then tune.

## D02. Approach: simulation bot, then tune
- **Chosen**: Build a headless simulation bot on top of the pure-function engine in `packages/game-core/src/engine.ts` (`createRun`, `startBattle`, `playMinion`, `castSpell`, `useHeroPower`, `fuseMinions`, `attackWithMinion`, `endPlayerTurn`, `chooseReward`, `advanceRun`) and run thousands of expeditions per class and difficulty.
- **Chosen**: The bot is a dev/measurement tool. It must not ship in the web bundle or change runtime game behavior.
- **Rationale**: Static stat analysis alone cannot verify that a change helps.

## D03. Bot policy
- **Chosen**: Reward selection uses a stat-efficiency heuristic (stat total relative to mana cost, class cards preferred) and actively uses fusion recipes.
- **Chosen**: In-battle play follows a simple greedy heuristic (spend mana efficiently, take good trades, use the hero power when available).
- **Interpretation**: The bot is weaker than a human. Only relative differences between classes, phases, and difficulties are treated as meaningful, not absolute win rates.

## D04. Target
- **Chosen**: Class-to-class win-rate (expedition completion) gap within ±5 percentage points on the bot simulation.
- **Chosen**: Measure both Normal and Hard difficulty.
- **Chosen**: Card and class tuning is shared across both difficulties. Normal-mode enemy phase scaling is changed only if measurement shows it is clearly too easy or too hard. Existing Hard-mode rules (phase bonuses, AI progression) are kept.

## D05. Allowed changes
- **Chosen**: Numeric values only: card cost, attack, health, spell damage/heal amounts, hero power numbers (e.g. armor amount, damage amount, soul-shard threshold), enemy hero health.
- **Chosen**: Keep card IDs, names, art keys, effect kinds, fusion recipes, and hero power mechanics unchanged so saved runs in `localStorage` stay compatible.
- **Not allowed**: Adding or removing cards, changing effect types, changing hero power rules.

## Initial hypotheses from static analysis (to verify by simulation)
- Warrior low-cost minions have higher stat totals than shared cards (1-cost 1/4 vs shared 1-cost 2/1).
- Assassin hero power (2 mana, 2 damage to any target, no condition) is more flexible than Warrior armor 2 or Demonist's shard-gated summon.
- Demonist is likely back-loaded (5-6 cost minions with summon tokens are very efficient; 2-cost 2/2 is weak).
- Shared spells `eclipse` (8 mana, 8 hero damage) and `healing-mist` (2 mana, heal 4) look weak.
- Normal difficulty has no phase scaling beyond enemy hero health, so Phase 3 may be too easy.
- Enemy decks are random from the shared catalog with no cost curve, so very high-cost cards can clog early hands.

## Implementation notes
- The existing test command is `npm test` (vitest, config in `apps/web/vite.config.ts`); lint is `npm run lint`; build is `npm run build`.
- Balance tuning in `packages/game-core/src/catalog.ts` and `engine.ts` must keep existing tests passing, updating test expectations only where a number intentionally changed.
- Hero power cost (2 mana) and `HARD_PHASE_*` constants live in `engine.ts`.
