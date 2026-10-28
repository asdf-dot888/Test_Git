# Task: T04 Mangostone Branding

## Status: done

## Goal

Replace player-facing “잿빛 원정 / ASHEN EXPEDITION” branding with the confirmed standalone title “망고스톤 / MANGO STONE” in the game and its player-facing architecture guide.

## Decision Summary

- Source: `.memory/decisions/2026-10-28-game-title-mangostone.md`.
- Korean title is exactly `망고스톤`; English brand is exactly `MANGO STONE`; do not add a subtitle.
- Change player-facing labels, document metadata and headings; keep unrelated technical package names and internal identifiers unchanged.

## Implementation

### I01. Update in-game title references

- Related Files:
  - `apps/web/src/components/MainMenu.tsx` :: game title and brand eyebrow — modify.
  - `apps/web/src/components/GameBoard.tsx` :: `.brand-mark` label and accessible name — modify.
  - `apps/web/src/components/ExpeditionRoadmap.tsx` :: English eyebrow — modify.
  - `apps/web/src/components/LeaderboardModal.tsx` :: brand eyebrow — modify.
  - `apps/web/src/components/GameGuideModal.tsx` :: brand eyebrow — modify.
  - Related component tests for menu, board, roadmap, leaderboard and guide — update title assertions; modify.

#### Details

- Use `망고스톤` for visible Korean title and accessible names, and `MANGO STONE` for English brand eyebrows.
- Keep the game guide and ranking descriptions/content unchanged beyond the brand label.
- Search the `apps/web/src` product UI and remove all remaining old user-facing title strings.

### I02. Update browser and guide metadata

- Related Files:
  - `apps/web/index.html` :: `<title>` and theme-adjacent document metadata — modify.
  - `docs/game-architecture.html` :: description, `<title>`, eyebrow, footer brand — modify.
  - `apps/web/public/game-architecture.html` :: same mirrored guide metadata and labels — modify.

#### Details

- Use Korean/English title consistently in browser title and guide metadata, e.g. `망고스톤 · MANGO STONE`.
- Keep the architecture descriptions and technical explanation unchanged; only replace old title/brand labels.
- Verify the source guide and the public copy remain equivalent for the replaced title fields.
- Search only product-facing code/docs for `잿빛 원정`, `ASHEN EXPEDITION`, and `Ashen Expedition`; references inside historical decisions/plans may remain.

## Acceptance Criteria

- [x] Main menu, combat brand, roadmap, ranking, guide, browser tab, and architecture guide use the confirmed Mangostone name.
- [x] Korean and English title spellings are consistent and no player-facing old title remains.
- [x] Technical package names and unrelated game copy remain unchanged.

## Validation

- `npm test -- apps/web/src/components/MainMenu.test.tsx apps/web/src/components/GameBoard.test.tsx apps/web/src/components/ExpeditionRoadmap.test.tsx apps/web/src/components/LeaderboardModal.test.tsx apps/web/src/components/GameGuideModal.test.tsx` — affected UI tests pass.
- `rg -n "잿빛 원정|ASHEN EXPEDITION|Ashen Expedition" apps/web/src apps/web/index.html apps/web/public/game-architecture.html docs/game-architecture.html` — no old player-facing title references remain.
- `npm run build --workspace @board-game/web` — web build succeeds.

## Commit Message

Validation note: all five affected UI test files passed (36 tests); targeted ESLint and web build passed. `rg` returned no old product title references. The source and public architecture guide copies have matching file hashes.

```text
feat(web): rename game branding to Mangostone

Plan: 2026-10-28-mangostone-game-polish
Phase: P02-player-experience
Task: T04-mangostone-branding

- Apply the Korean and English titles across game surfaces
- Update browser and architecture guide branding
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: pending

