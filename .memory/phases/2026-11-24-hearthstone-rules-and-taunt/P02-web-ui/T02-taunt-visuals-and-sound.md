# Task: T02 Taunt Visuals and Sound

## Status: done

## Goal
Taunt minions are recognizable on the board and in card views, blocked targets are dimmed while attacking, and short synthesized sounds play when a taunt minion is played and when an attack is blocked.

## Decision Summary
D07 (option C: shield border, "도발" in the description, dimmed blocked targets, sound cues without new audio files).

## Implementation
- `apps/web/src/components/MinionCard.tsx`: a taunt minion (`hasTaunt(minion)` from game-core) gets the class `is-taunt` and a shield-shaped border (CSS in `styles/board.css`: a thick metallic frame with a small shield corner badge; respect `prefers-reduced-motion`; dark and light themes use the existing tokens). Add an `aria-label` suffix `, 도발`. `CardView.tsx` (hand and details popups) shows the description with the leading `도발.` rendered as a small shield tag (the text itself comes from the catalog; keep the plain text in the accessible name). `CardInspection`/`CardDetailsPopup` need no new logic if they use `CardView`.
- Blocked targets: `MinionLane.tsx` applies `is-blocked-target` (opacity 0.45, grayscale 0.4, no hover lift) to illegal enemy minions in attack mode and during an attacker drag (`getValidTargets` already lists the legal ones, reuse it); the enemy hero gets the same class when `heroAllowed` is false. Legal targets keep the existing highlight.
- Sounds (`apps/web/src/game/audio.ts` and `soundRecipes.ts`, same pattern as the `HOVER_*` synthesized cue; no files): `playTauntSummon()` (short low metallic "clank": two detuned sine/triangle hits, ≤ 250 ms) when a taunt minion is played by either side, and `playTauntBlocked()` (muted dull thud + short high tick, ≤ 150 ms) when the player taps/drops an attack on a blocked target. Honor the existing sound settings and mute flags. Hook the calls where play-minion effects are dispatched (see how `combatEffects.ts` events map to sounds in `audio.ts`) and where the blocked-target message is set (`gameActions.ts` error path for the taunt message → a `soundCue` field or a callback in `App.tsx`).
- `dev/EffectsPreview.tsx`: add both cues and a taunt minion sample so the user can preview them at `/?effects-preview`.
### Tests
- `MinionCard.test.tsx` (class and aria label), `CardView.test.tsx` (taunt tag), `MinionLane.test.tsx` (blocked class in attack mode and while dragging), `audio.test.ts` / `soundRecipes.test.ts` (new recipes exist, respect mute and volume, durations within bounds), `App.audio.test.tsx` (the blocked cue plays once on a rejected attack).

## Acceptance Criteria
- [ ] Taunt minions and cards are visibly marked; blocked targets are dimmed; two new cues exist and obey the sound settings.
- [ ] No new audio files; `npm run build`, `npm test`, `npm run lint` pass.
- [ ] The user's check of the look and the sounds is listed in the final checklist (P03-T02).

## Validation
- `npm run build`
- `npm test -- apps/web/src`
- `npm test`, `npm run lint`

## Commit Message
```text
feat(web): show taunt on minions and cards, dim blocked targets and add taunt sounds

Plan: 2026-11-24-hearthstone-rules-and-taunt
Phase: P02-web-ui
Task: T02-taunt-visuals-and-sound
```

## Progress
- [x] done. Visuals: `MinionCard` `is-taunt` (metal frame, shield badge, spoken '도발'), `CardDescription` shows a leading 도발 as a tag in CardView/CardInspection/CardDetailsPopup, `is-blocked-target` dims shielded enemy minions and the enemy hero (selected attacker or touch drag of a minion). Sounds: synthesized `TAUNT_CUE_RECIPES` (taunt-summon ≤260 ms, taunt-blocked ≤170 ms, not part of the spell registry) played through `playEffect('taunt-summon'|'taunt-blocked')`; the summon cue is added to the summon event of a taunt minion, the blocked cue plays when `session.tauntBlocks` grows; the effects preview page has buttons for both. Tests added for card, description, recipes, audio, events, blocked state. 1252 tests (102 files), lint and build pass. Look and sound still need the user's check (checklist in P03-T02).
- commit: see Git history
