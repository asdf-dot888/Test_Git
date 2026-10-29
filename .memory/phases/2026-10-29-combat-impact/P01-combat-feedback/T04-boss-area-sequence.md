# Task: T04 Phase-Specific Boss Area Sequence

## Status: in_progress

## Goal
Turn the boss-area warning into a clear ordered sequence: warning, phase-themed cast, then a large field-wide impact with strong flash and shake. Preserve boss damage values and per-target event playback.

## Decision Summary
- Keep a warning before the boss casts.
- Phase 1: cursed forest roots. Phase 2: demonic red sigil and flames. Phase 3: ancient dragon sweeping fire wave.
- Follow each cast with a large board-wide impact, intense flash, and shake. Use the dedicated boss-area sound from T03.
- Boss-area size/intensity overrides per-target tier, but each victim retains an independent damage event.
- Play full effects even with `prefers-reduced-motion: reduce` enabled.

## Implementation

### I01. Carry boss phase and stage the warning/cast/impact timeline
- Related Files:
  - `apps/web/src/game/combatEffects.ts` :: boss-area event construction and `bossPhase`; modify
  - `apps/web/src/components/CombatEffectLayer.tsx` :: boss-area event renderer and completion timing; modify
  - `apps/web/src/components/BossAreaSequence.tsx` :: optional isolated stage/timer component; new only if separation keeps `CombatEffectLayer` readable
  - `apps/web/src/styles/board.css` :: boss warning, phase-cast effects, impact flash, and keyframes; modify
  - `apps/web/src/components/CombatEffectLayer.test.tsx` :: staged boss sequence lifecycle; modify
  - `apps/web/src/game/combatEffects.test.ts` :: phase assignment; modify

#### Details
- **Signatures & Types**:
  ```typescript
  type BossPhase = 1 | 2 | 3;
  type BossAreaStage = "warning" | "cast" | "impact";

  interface BossAreaSequenceProps {
    phase: BossPhase | undefined;
    paused: boolean;
    onComplete(): void;
  }
  ```
- **Data & Schema Fields**:
  - Use `event.bossArea === true` and T01's `event.bossPhase` to choose the animation. Do not infer phase from localized boss names or card art.
  - Keep stage state local to the component; never persist it in `RunState`, `BattleState`, or saved progress.
  - Use CSS `data-boss-phase="1|2|3"` for phase selection and `data-boss-stage="warning|cast|impact"` for stage rendering.
- **Execution Flow / Logic**:
  1. Render the existing red warning frame first for 1,250 ms, matching its current pulse duration. Do not start the cast animation or impact flash during this stage.
  2. Run the selected cast for 1,200 ms: phase 1 roots grow inward and constrict across the board; phase 2 a large red demonic sigil forms, then flames sweep; phase 3 a broad ancient-dragon fire wave sweeps across the battlefield. Keep motifs legible on mobile.
  3. Show the large board impact for 900 ms after the cast: use the current area impact enlarged to its boss maximum, followed by a bright field flash and strong shake. Boss-area presentation always overrides the ordinary 1-damage visual tier.
  4. Total intended presentation is 3,350 ms (1,250 warning + 1,200 cast + 900 impact). Call `onComplete` exactly once after the impact ends. Keep `CombatEffectLayer`'s effect completion ID and enemy playback ordering intact.
  5. Pause/resume must preserve the current stage and its remaining time, consistent with the existing `CombatEffectLayer` pause behavior. Clear timers and board classes on unmount.
  6. Add a generic crimson cast fallback if `bossPhase` is missing or invalid; do not crash or skip the warning/impact.
  7. Keep all overlays `aria-hidden` and `pointer-events: none`; do not cover mobile board controls after the sequence completes.
  8. Do not change boss turn frequency, warning/intent rules, targets, or damage. Ensure reduced-motion CSS does not disable the selected warning, cast, impact, flash, or shake sequence.

### I02. Verify phase selection and ordering
- Related Files:
  - `apps/web/src/components/CombatEffectLayer.test.tsx` :: warning/cast/impact and completion ordering; modify
  - `apps/web/src/game/combatEffects.test.ts` :: phase 1/2/3 event metadata; modify
#### Details
- Assert phases 1/2/3 select their exact `data-boss-phase` and the fallback is used when phase is missing.
- Assert stage order is warning → cast → impact and completion occurs exactly once after impact.
- Assert pause/resume preserves stage progress and unmount clears all timers/classes.
- Assert boss-area stays the large visual/sound override when its per-target amount is 1.

## Acceptance Criteria
- [ ] Boss attacks visibly warn, cast using the phase motif, then impact the full board in order.
- [ ] Phase visuals match cursed forest, demon, and ancient dragon themes on desktop and mobile.
- [ ] Boss area remains substantially larger and heavier than an ordinary 1-damage hit.
- [ ] Enemy playback waits until the sequence ends and resumes correctly after pauses.
- [ ] Gameplay rules and damage results do not change.

## Validation
- `npm.cmd test -- apps/web/src/components/CombatEffectLayer.test.tsx apps/web/src/game/combatEffects.test.ts` — run after implementation.
- `npm.cmd run build --workspace @board-game/web` — run after implementation.

## Commit Message
```text
feat(web): add phase-specific boss area cast effects

Plan: 2026-10-29-combat-impact
Phase: P01-combat-feedback
Task: T04-boss-area-sequence

- Sequence boss warning, themed cast, and full-board impact
- Keep phase themes and playback timing consistent
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending

