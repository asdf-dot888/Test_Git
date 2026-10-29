# Plan: Mobile Card UX, Opening Hand Redraw, and Victory Presentation

## Goal
Remove broken art for every catalog card, make effects readable on mobile and when cards are disabled, allow one opening-hand redraw, automatically end the player's turn after all-attack, and present mobile layouts and lethal victories with clear pacing.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | Fill card assets, implement card inspection and opening redraw, sequence auto-end and cinematic victory, then polish mobile layouts. | [P01](../phases/2026-10-29-mobile-card-ux-opening-redraw-victory/P01-mobile-and-battle-polish/phase.md) |

## Dependencies
- P01-T01 creates the art files and adds catalog art coverage.
- P01-T02 defines card preview interactions before T06 tunes their mobile layout.
- P01-T03 persists redraw availability before exposing its hand-panel control.
- P01-T04 waits for the existing combat effect queue to finish before ending the turn.
- P01-T05 preserves the completed battle until the lethal animation, defeat effect, and victory reveal finish.
- P01-T07 aligns API save validation with the game engine's six-minion board capacity on both sides.

## Planning Notes
- Missing card art keys: `fate-shard`, `reaper-cleave`, `soul-bargain`, `stolen-fate`.
- The one-time, full three-card redraw is available only before the first gameplay action of the first encounter, on desktop and mobile; it is consumed immediately when used.
- Desktop hover and touch long press are inspection gestures; ordinary tap/click behavior remains unchanged. Disabled cards remain inspectable.
- All-attack ends the turn on either device only after every attack effect finishes and only if the enemy hero survives.
- A lethal strike, cracked-portrait/flame/ash defeat effect, and large centered victory reveal each play at 0.5x; the reveal sits over a dimmed battlefield and keeps confirmation before rewards.
- Redraw availability is persisted so a refresh cannot grant a second redraw.
- API save validation currently caps each battle board at five minions while the engine allows six; P01-T07 raises the persisted-state limit to six and covers rejection above that limit.
- This plan contains blueprints only; implementation and validation happen during memory-execute.
