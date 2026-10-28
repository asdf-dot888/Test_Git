# Task: T02 Hand Card Height and Artwork Fit

## Status: done

## Goal
Increase the height of every hand card to 1.5 times its current breakpoint-specific minimum height, keep its current width unchanged, and show the complete square or portrait card illustration without cropping.

## Decision Summary
- Preserve `.game-card` width values and horizontal scrolling; only increase card height and artwork room.
- Fit each image fully inside the art frame while preserving its source aspect ratio.
- Keep visible card name, mana cost, and minion attack/health labels legible.

## Implementation

### I01. Scale hand card height and artwork by 1.5
- Related Files:
  - `apps/web/src/styles/board.css` :: `.game-card`, `.card-art`, `.card-art img`, and responsive rules under `max-width: 760px`, `max-height: 760px`, and `max-height: 680px`; modify.
- Details:
  - Leave `.game-card` `flex-basis`, `width`, and `min-width` values unchanged. Current widths are `clamp(96px, 8vw, 122px)` by default and `96px` at mobile width.
  - Multiply each existing breakpoint minimum card height by 1.5: default 112px → 168px; mobile 104px → 156px; max-height 760px 96px → 144px; max-height 680px 88px → 132px. Preserve the existing media-query cascade so the narrowest/shortest matching breakpoint still wins.
  - Increase the image viewport by the same factor to use the added height: default `clamp(34px, 5vh, 58px)` → `clamp(51px, 7.5vh, 87px)`; mobile 39px → about 59px; max-height 760px 34px → 51px; max-height 680px 29px → about 44px.
  - Set `.card-art img` to `object-fit: contain` and center it. Keep the art frame's dark background visible in any unused space. Do not use `cover` or crop the original image.
  - Preserve `.hand-cards` as a single horizontal row with existing overflow/touch behavior. Do not change the card width to make space for the taller card.

### I02. Verify card sizing rules and existing hand content
- Related Files:
  - `apps/web/src/components/CardView.test.tsx` :: `CardView` markup tests; extend only if a semantic image attribute is needed.
  - `apps/web/src/components/GameBoard.test.tsx` :: hand display regression coverage; extend only if required by the CSS change.
- Details:
  - Confirm existing rendering still includes card name, mana cost, and attack/health for minions.
  - Inspect the stylesheet diff to confirm all card width declarations are unchanged and each min-height/image-height breakpoint is 1.5x its previous value.

## Acceptance Criteria
- [x] Hand card width is unchanged at desktop, mobile, and short-height breakpoints.
- [x] Hand card minimum height and art viewport are each 1.5x the prior value at all declared breakpoints.
- [x] Both square and portrait source artwork display in full without cropping.
- [x] Horizontal mouse/touch scrolling and visible card labels remain intact.

## Validation
- `npm.cmd run test --workspace @board-game/web -- src/components/CardView.test.tsx src/components/GameBoard.test.tsx` — existing hand rendering regressions pass.
- `npm.cmd run build --workspace @board-game/web` — production build passes.
- Review `git diff -- apps/web/src/styles/board.css` — verify widths are unchanged and sizing values match the 1.5x table above.

## Commit Message
```text
feat(web): enlarge hand cards vertically

Plan: 2026-10-28-hero-power-and-hand-card-presentation
Phase: P01-ability-and-hand-ui
Task: T02-hand-card-height-and-art

- Increase hand card and artwork height without changing width
- Fit full card illustrations without cropping
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
