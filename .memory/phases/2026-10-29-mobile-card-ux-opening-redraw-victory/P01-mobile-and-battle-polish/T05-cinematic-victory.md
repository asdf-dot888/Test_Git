# Task: T05 Cinematic Lethal Attack and Victory

## Status: pending

## Goal
Replace the abrupt victory transition with a visible half-speed final attack, an enemy-hero defeat effect, and a large half-speed victory reveal over the dimmed battle.

## Decision Summary
- The lethal player attack plays at 0.5x while the battle remains visible.
- The enemy portrait then cracks and collapses in red flame and black ash, with slight screen shake, also at 0.5x.
- After the defeat effect completes, show a large centered “승리” and confirmation button over the dim battle, with reveal at 0.5x.
- Keep the existing confirmation step before rewards.

## Implementation

### I01. Preserve the completed battle during acknowledgement
- Related Files:
  - `packages/game-core/src/engine.ts` :: `finishVictory`, `acknowledgeVictory`, final-boss battle retention; modify.
  - `packages/game-core/src/engine.test.ts` :: normal/final-boss victory state; modify.

#### Details
- Keep `pendingVictoryAcknowledgement` and pending reward as the durable logical win state.
- Preserve the completed `battle` while final-boss victory acknowledgement is pending, so the enemy portrait remains renderable beneath the final presentation. Clear it when `acknowledgeVictory` confirms the final-boss result.
- Keep normal encounter's completed `playerWon` battle behavior compatible with reward selection and roadmap advancement.
- If a saved run already has pending victory but no transient UI presentation state, fall back directly to the victory reveal; do not wait for an animation callback that cannot return after refresh.

### I02. Sequence slow final hit and enemy defeat effect
- Related Files:
  - `apps/web/src/game/combatEffects.ts` :: `CombatEffectEvent` and lethal attack event creation; modify.
  - `apps/web/src/components/CombatEffectLayer.tsx` :: slow-motion timing and completion callback; modify.
  - `apps/web/src/components/EnemyHeroDefeatEffect.tsx` :: portrait crack/flame/ash sequence; new.
  - `apps/web/src/game/gameActions.ts` :: `GameSession` victory presentation stage; modify.
  - `apps/web/src/game/combatEffects.test.ts` :: lethal event metadata; modify.
  - `apps/web/src/components/CombatEffectLayer.test.tsx` :: effect DOM/completion; modify.

#### Details
- Add optional `slowMotion: boolean` to combat presentation event data. Set it only on an attack whose before-run enemy hero health is positive and after-run health is zero. For all-attack, mark the final lethal attacker event only.
- Slow the lethal strike as a complete 0.5x segment: double its animation durations and relative waits; fire completion only after the slowed impact ends. Do not slow ordinary attacks.
- Track `victoryPresentation: "enemy-defeat" | "victory-reveal" | null` in `GameSession`. On a successful lethal player action set `enemy-defeat`; after the lethal event completes show the dedicated enemy portrait effect; its completion advances to `victory-reveal`.
- Anchor the effect to the enemy hero portrait using existing `.hero-panel`/`data-effect-anchor` geometry. Build procedural visuals from crack lines, red flame glow, drifting black-ash particles, and slight board shake; no new raster asset is needed.
- On refresh during an already-persisted victory, initialize directly at `victory-reveal`.

### I03. Render the cinematic victory reveal
- Related Files:
  - `apps/web/src/App.tsx` :: completed battle composition and acknowledgement routing; modify.
  - `apps/web/src/components/VictoryScreen.tsx` :: centered reveal overlay; modify.
  - `apps/web/src/styles/board.css` :: slow-motion, defeat effect, dim backdrop, and title reveal animations; modify.
  - `apps/web/src/App.outcome.test.tsx` :: sequencing, confirmation, and refresh fallback; modify.
  - `apps/web/src/components/VictoryScreen.test.tsx` :: large reveal and confirmation; modify/create if absent.

#### Details
- While presentation is `enemy-defeat` or `victory-reveal`, retain `GameBoard` in the rendered tree under the effect/overlay rather than immediately returning only `VictoryScreen`.
- After enemy defeat completes, dim the battle and show a fixed full-screen overlay with a prominent centered “승리”, existing battle-cleared label, and confirmation button. Use twice the ordinary title animation duration to achieve 0.5x playback.
- Confirmation invokes the existing acknowledgement once and then uses the existing reward flow.
- Keep the turn timer paused and gameplay controls disabled for the entire presentation.
- Provide a `prefers-reduced-motion` fallback with an immediate stable presentation; never block the confirmation callback if `animationend` fails to fire.

## Acceptance Criteria
- [ ] The final strike is visible at half speed before the enemy defeat effect.
- [ ] Enemy portrait cracks and collapses in red flame/black ash at half speed with slight shake.
- [ ] A large victory title appears at half speed over the dim battlefield after the defeat effect.
- [ ] Confirmation continues to the existing reward flow; refresh during an acknowledged-pending win cannot deadlock.
- [ ] Nonlethal attack timing remains unchanged.

## Validation
- `npm test -- apps/web/src/game/combatEffects.test.ts apps/web/src/components/CombatEffectLayer.test.tsx apps/web/src/App.outcome.test.tsx apps/web/src/components/VictoryScreen.test.tsx packages/game-core/src/engine.test.ts` — effect, acknowledgement, and normal/final victory tests pass; if a focused file is absent, put coverage in the closest existing suite.
- `npm run build` — all workspaces build.

## Commit Message
```text
feat(game): stage a cinematic victory after lethal attacks

Plan: 2026-10-29-mobile-card-ux-opening-redraw-victory
Phase: P01-mobile-and-battle-polish
Task: T05-cinematic-victory

- Preserve the battle until the enemy defeat effect completes
- Reveal a half-speed victory overlay before reward acknowledgement
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
