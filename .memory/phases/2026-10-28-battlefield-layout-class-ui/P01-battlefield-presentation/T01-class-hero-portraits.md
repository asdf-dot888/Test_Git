# Task: T01 Class Hero Portraits

## Status: done

## Goal
Create three distinct, cohesive dark-fantasy hero portrait assets and display the selected class's portrait in the battle hero panel, while preserving the existing portrait for legacy runs.

## Decision Summary
- Create face-and-shoulders portraits for a male Warrior, female Assassin, and female Demonist, all adult dark-fantasy characters.
- Use class IDs as stable asset keys: `warrior`, `assassin`, and `demonist`.
- Runs without a class keep using `/art/heroes/player.png`.

## Implementation

### I01. Create the class portrait assets
- Related Files:
  - `apps/web/public/art/heroes/warrior.png` :: new male Warrior portrait.
  - `apps/web/public/art/heroes/assassin.png` :: new female Assassin portrait.
  - `apps/web/public/art/heroes/demonist.png` :: new female Demonist portrait.
- Details
  - Generate one square, raster portrait per asset, composed around face and shoulders for a circular 65px battle crop and larger class-selection use.
  - Keep one consistent painterly dark-fantasy art direction, lighting, and contrast across all three images; do not include text, logos, borders, or UI.
  - Character identities: battle-worn male armored Warrior; adult female elven shadow Assassin; adult female occult Demonist with restrained demonic motifs.
  - Keep faces and defining class cues centered inside the central square-safe crop; use separate silhouettes, costume, and accent colors so portraits remain distinguishable at small sizes.

### I02. Resolve player portrait by selected class
- Related Files:
  - `apps/web/src/components/GameBoard.tsx` :: player `HeroPanel` composition; modify.
  - `apps/web/src/components/HeroPanel.tsx` :: existing `artKey`-based `/art/heroes/{artKey}.png` path; read-only unless prop typing needs adjustment.
  - `apps/web/src/components/GameBoard.test.tsx` :: class and legacy portrait assertions; modify.
  - `apps/web/src/components/HeroPanel.test.tsx` :: portrait path regression; modify only if the HeroPanel prop contract changes.
- Details
  - Select `run.playerClass` as the player hero's `artKey`; use `player` when it is absent. The type is `PlayerClass | undefined`, with valid IDs `warrior | assassin | demonist`.
  - Keep enemy hero artwork sourced from `ENEMY_BY_ID` exactly as it is.
  - Add render assertions that class runs render `/art/heroes/warrior.png`, `/art/heroes/assassin.png`, or `/art/heroes/demonist.png` and legacy runs render `/art/heroes/player.png`.

## Acceptance Criteria
- [x] Three square class portraits exist at the specified paths and have no embedded text or UI.
- [x] Each new class run displays its matching player portrait in battle.
- [x] Classless legacy runs keep the existing `player.png` portrait.
- [x] Enemy portrait selection is unchanged.

## Validation
- `npm run test --workspace @board-game/web -- src/components/HeroPanel.test.tsx src/components/GameBoard.test.tsx` — class and legacy portrait paths pass.
- `npm run build --workspace @board-game/web` — TypeScript and production asset build pass.

## Commit Message
```text
feat(web): add distinct class hero portraits

Plan: 2026-10-28-battlefield-layout-class-ui
Phase: P01-battlefield-presentation
Task: T01-class-hero-portraits

- Add Warrior, Assassin, and Demonist hero art
- Select the player portrait from the run class
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
