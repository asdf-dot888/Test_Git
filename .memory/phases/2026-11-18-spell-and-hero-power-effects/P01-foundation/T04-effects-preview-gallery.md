# Task: T04 Effects Preview Gallery

## Status: done

## Goal
Provide a dev-only page that plays any registered effect (visual + sound) on a fake board, so effects can be reviewed without signing in or playing a battle.

## Decision Summary
- The effects are visual and audible; unit tests cannot judge them. A gallery makes each content task reviewable and lets the user preview everything.
- Dev only: not reachable in production builds.

## Implementation
### I01. Gallery component
- `apps/web/src/dev/EffectsPreview.tsx` (new)
  - A fake battle surface: an element with class `battle-board` containing anchors `data-effect-anchor="hero:enemy"`, `hero:player`, `minion:enemy:0..2`, `minion:player:0..2`, and a hand strip anchor, laid out like the real board (reuse board CSS tokens).
  - A control bar listing every id in `REQUIRED_SPELL_VISUAL_IDS`; ids without a registry spec are shown disabled with "no visual yet". Selecting an id and pressing **Play** pushes a synthetic `CombatEffectEvent` (source = player hand or hero, target = chosen anchor, `visualId`, `visualRole: "primary"`, `effectKind` from the effect, plus an optional fake damage result so hit consequences can be reviewed) into `<CombatEffectLayer>`. Controls: target (enemy hero / enemy minion / player minion / player hero), side (player cast / enemy cast), damage amount (0 = no hit), "slow motion" toggle, **Play all** (sequentially with gaps), sound on/off.
  - Uses `createAudioController` and plays both the existing sample cues (`combatEventSounds`) and `playSpellCue`, starting on the first click (browser autoplay rule).
  - Shows the spec's `totalMs`, `impactAtMs`, and weight under the selected id.
- `apps/web/src/main.tsx`: when `import.meta.env.DEV` and `new URLSearchParams(location.search).has("effects-preview")`, render `<EffectsPreview />` instead of the authenticated app (no MSAL, no login). In production builds the branch is dead code (guarded by `import.meta.env.DEV`).
### I02. Tests
- `apps/web/src/dev/EffectsPreview.test.tsx` (new): renders one list entry per required id; entries without a spec are disabled; pressing Play on an injected spec mounts `.spell-fx`; the page has the anchors needed by the layer.
- A build check: after `npm run build`, `apps/web/dist` does not contain the string `EffectsPreview` (or `effects-preview`).

## Acceptance Criteria
- [ ] `npm run dev` then opening `/?effects-preview` shows the gallery and can play any registered effect with sound.
- [ ] The production bundle does not contain the preview.
- [ ] Tests, lint, build pass.

## Validation
- `npm run build` then `npm test -- apps/web/src/dev/EffectsPreview.test.tsx`
- `npm test`, `npm run lint`, `npm run build`, then `grep -r "effects-preview" apps/web/dist` finds nothing.

## Commit Message
```text
feat(dev): add effects preview gallery

Plan: 2026-11-18-spell-and-hero-power-effects
Phase: P01-foundation
Task: T04-effects-preview-gallery
```

## Progress
- [x] implementation complete
- [x] validation passed: 884 tests, lint clean, build clean; no 'effects-preview', 'EffectsPreview' or preview CSS in apps/web/dist. Added dev/EffectsPreview.tsx, dev/previewEvents.ts, dev/effectsPreview.css, main.tsx gate (import.meta.env.DEV + ?effects-preview). Also fixed a gap from T02: board shake CSS had a fixed 930 ms delay, so it now uses --hit-delay (set by CombatEffectLayer from the spec's impactAtMs; legacy 930 ms otherwise) and combatKindForSpellEffect is exported.
- commit: see Git history
