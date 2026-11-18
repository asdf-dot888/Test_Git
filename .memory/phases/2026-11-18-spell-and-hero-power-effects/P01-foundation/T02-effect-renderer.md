# Task: T02 Effect Renderer

## Status: done

## Goal
Render a spec-driven SVG/CSS effect for primary events and integrate it into `CombatEffectLayer`, replacing the card-art flight for tagged spells and hero powers, with the old presentation as fallback.

## Decision Summary
- D03: procedural CSS and inline SVG only; animate `transform` and `opacity`; no new images or dependencies.
- D04: spell/hero power start effect replaces the flying card; the existing hit consequences (damage tier flash, blood, deaths, armor spark, miss fragments) still play after it; follow-up events draw no sprite.
- D05/D07: durations come from the spec; nothing depends on `prefers-reduced-motion`.

## Implementation
### I01. Visual component
- `apps/web/src/components/SpellEffectVisual.tsx` (new)
  - Props: `{ spec: SpellVisualSpec; source: Point; target: Point; paused: boolean; delayMs: number; slowMotion: boolean }`.
  - Renders one absolutely positioned wrapper (`position: fixed; left/top = source; z-index 31`) with three child layers in order: `start` (at the source for hand/hero casts or at the target for self-targeted effects), `travel` (from source to target using `--effect-dx/--effect-dy`), `burst` (at the target). Timings: start 0..`impactAtMs * 0.45`, travel up to `impactAtMs`, burst `impactAtMs`..`totalMs`.
  - `aria-hidden="true"`, `pointer-events: none`.
  - CSS custom properties from the spec: `--fx-primary`, `--fx-secondary`, `--fx-glow`, `--fx-impact-at`, `--fx-total`, `--fx-dx`, `--fx-dy`.
- `apps/web/src/game/spellEffectMotifs.tsx` (new): the motif library as small React components (each <= 24 DOM nodes): start motifs `gather`, `circle`, `rise`, `sweep`, `shimmer`, `flare`, `sigil`, `unfurl`; travel motifs `bolt`, `lance`, `arc`, `fall`, `thread`, `stream`, `none`; burst motifs `ring`, `shatter`, `slash-cross`, `column`, `wave`, `mist`, `bloom`, `crater`, `portal`, `chain`. Export `START_MOTIFS`, `TRAVEL_MOTIFS`, `BURST_MOTIFS` records and a `GLYPHS: Record<string, ReactNode>` map (empty in this task; content tasks add one unique SVG glyph per effect). Content tasks may add motifs.
- `apps/web/src/styles/spellEffects.css` (new, imported in `apps/web/src/main.tsx` after `board.css`): base `.spell-fx*` classes and keyframes for the motifs above. No `@media (prefers-reduced-motion)` rules.
### I02. Layer integration
- `apps/web/src/components/CombatEffectLayer.tsx`
  - New optional prop `resolveSpec?: (id: string | null | undefined) => SpellVisualSpec | undefined` defaulting to `getSpellVisualSpec` (so tests can inject specs).
  - In `EffectSprite`: `const spec = event.visualRole ? resolveSpec(event.visualId) : undefined;` `const isPrimaryVisual = spec && event.visualRole === "primary"`; `const isFollowUp = spec && event.visualRole === "follow-up"`.
  - Replace the literal `930` (impact delay, hit consequence delays, `combat-effect-impact` delay, target style delay, shake duration offset) with `const hitDelayMs = spec ? spec.impactAtMs : 930` wherever it applies to this event.
  - Completion: for events with a spec use `spec.totalMs` (instead of `Math.max(1400, 1010 + profile.durationMs)`), still plus the `index * 120` stagger and `motionScale` for slow motion; keep the old value when no spec.
  - Render: when `isPrimaryVisual`, render `<SpellEffectVisual .../>` and suppress the card frame, the generic `combat-effect-impact` box (its `onAnimationEnd` completion is replaced by the timer), and the generic impact art. When `isFollowUp`, suppress the card frame and the generic sprite as well, but keep the hit consequences. Hit consequences (blood splatter, hero flash, armor spark, miss fragments, deaths) render unchanged for both.
  - Events without a spec render exactly as before.
### I03. Tests
- `apps/web/src/components/CombatEffectLayer.test.tsx`
  - With an injected spec: a primary event renders `.spell-fx` and no `.combat-effect-card-frame`; the hit consequence span uses an animation delay equal to the spec's `impactAtMs`; the event completes at `totalMs` (fake timers) and not before; a follow-up event renders no sprite but keeps its blood splatter/hero flash; a tagged event whose spec resolver returns undefined falls back to the card frame; slow motion doubles timings.
  - Existing tests for untagged events pass unchanged.
- `apps/web/src/components/SpellEffectVisual.test.tsx` (new): renders the three layers, applies spec CSS variables, node count <= 72 total per effect, pauses with `paused`.
- `apps/web/src/game/spellEffectMotifs.test.ts` (new): every motif id referenced is defined; motif components render <= 24 nodes.

## Acceptance Criteria
- [ ] A tagged primary event shows the SVG effect instead of the flying card, with the old hit consequences delayed to `impactAtMs`.
- [ ] Fallback (no spec) and all existing tests unchanged.
- [ ] No new dependency; CSS animates only transform/opacity.
- [ ] Tests, lint, build pass.

## Validation
- `npm run build` then `npm test -- apps/web/src/components/CombatEffectLayer.test.tsx apps/web/src/components/SpellEffectVisual.test.tsx apps/web/src/game/spellEffectMotifs.test.ts`
- `npm test`, `npm run lint`, `npm run build`

## Commit Message
```text
feat(effects): render spec-driven spell visuals in the combat effect layer

Plan: 2026-11-18-spell-and-hero-power-effects
Phase: P01-foundation
Task: T02-effect-renderer
```

## Progress
- [x] implementation complete
- [x] validation passed: 850 tests, lint clean, build clean. Added SpellEffectVisual, spellEffectMotifs (8 start / 7 travel / 10 burst motifs, GLYPHS map), spellEffects.css, and the CombatEffectLayer integration (resolveSpec prop, hit delay = spec.impactAtMs, completion = spec.totalMs, fallback unchanged). Spec gained an optional startAt field. Lessons: a comment containing '*/' ended the CSS comment early and broke the lightningcss minifier; local helper components in a file that exports non-components fail the react-refresh lint rule, so the dot helper is a plain function.
- commit: see Git history
