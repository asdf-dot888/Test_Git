# Task: T01 Fixed-Size Hover Preview

## Status: todo

## Goal
On PC, hovering (or keyboard-focusing) a card in the discard picker, and the “추가할 카드” line in the reward-overflow case, shows a fixed-size card preview with art, cost, name, kind, stats and effect. The hand preview keeps its current size.

## Decision Summary
- Discard D01: same floating full-card preview as the hand. D02: fixed about 220×320 px, shrunk to fit the viewport, same placement rules (above the anchor when there is room, otherwise below, clamped). D03: the added-card line is inspectable too. D04: keyboard focus also shows the preview; discard rules unchanged.

## Implementation
### I01. Pure preview rectangle
- `apps/web/src/components/CardInspection.tsx`
  - Export `HOVER_PREVIEW_SIZE = { width: 220, height: 320 } as const`.
  - Export `computePreviewRect(anchor: { left; top; right; bottom; width; height }, viewport: { width; height }, mode: "scaled" | "fixed"): PreviewRect` (move the logic out of `showDesktopPreview`).
    - `"scaled"`: current behavior (1.5× the anchor, clamped to `viewport - 16`), unchanged numbers.
    - `"fixed"`: `scale = Math.min(1, (viewport.width - 16) / 220, (viewport.height - 16) / 320)`; `width = 220 * scale`, `height = 320 * scale`; `preferredTop = anchor.top - height - 10 >= 8 ? anchor.top - height - 10 : anchor.bottom + 10`; `left` centered on the anchor and clamped to `[8, viewport.width - width - 8]`; `top` clamped to `[8, viewport.height - height - 8]`.
### I02. Component props and events
- `CardInspectionProps` gains `hoverSize?: "scaled" | "fixed"` (default `"scaled"`).
- `showDesktopPreview` calls `computePreviewRect(rect, { width: innerWidth, height: innerHeight }, hoverSize)`.
- Add `onFocus` (shows the preview when `desktopHover`, anchored on the wrapper) and `onBlur` (hides it) on the wrapper; the existing `matchMedia("(hover: hover) and (pointer: fine)")` guard stays for mouse hover only, focus is always allowed.
- Preview element gets class `game-card-hover-preview` plus `game-card-hover-preview--fixed` when fixed.
### I03. Usage
- `apps/web/src/components/DiscardPicker.tsx`: pass `desktopHover hoverSize="fixed"` to each `CardInspection`.
- Same file, reward-overflow line (`reward-being-added`): when `reward` exists, wrap the line in `<CardInspection card={reward} className="reward-added-inspection" desktopHover hoverSize="fixed">` and make the name a focusable `<button type="button" className="reward-being-added__name">` (so keyboard focus works). The layout of the dialog does not change.
### I04. Styles
- `apps/web/src/styles/board.css`: `.game-card-hover-preview--fixed` with larger type (cost 28px, name 16px, stats 14px, kind 12px, description 13px); `.reward-being-added__name` styled like the current `strong` (gold, no button chrome).

## Acceptance Criteria
- [ ] Hovering or focusing a discard card shows a 220×320 preview (smaller only when the viewport is smaller) that never leaves the viewport and does not block clicking the chip.
- [ ] Hand hover preview is unchanged (same numbers as before).
- [ ] The added-card line shows the same preview in the deck-overflow case.
- [ ] Tests, lint, build pass.

## Validation
- `npm run build`
- `npm test -- apps/web/src/components/CardInspection.test.tsx apps/web/src/components/DiscardPicker.test.tsx apps/web/src/components/CardView.test.tsx`
- Tests to add: `computePreviewRect` (scaled keeps old numbers; fixed 220×320 above/below placement, clamping, small viewport shrink); `DiscardPicker` hover shows `.game-card-hover-preview--fixed` with the card name and description and hides on mouse leave; focus shows it; reward line hover shows the reward card; hand `CardView` still renders the scaled preview.
- `npm test`
- `npm run lint`
- Manual (user): `npm run dev`, fill the hand to 10 cards and end a turn, hover the discard cards.

## Commit Message
```text
feat(web): show a fixed-size card preview in the discard picker

Plan: 2026-11-19-card-details-and-touch-drag
Phase: P01-pc-hover-preview
Task: T01-fixed-hover-preview
```

## Progress
- [ ] implementation complete
- [ ] validation passed
- commit: pending
