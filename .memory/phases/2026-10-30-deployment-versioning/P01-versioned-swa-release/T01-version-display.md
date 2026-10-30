# Task: T01 Canonical Version and Main-Menu Display

## Status: done

## Goal

Create canonical version metadata at 1.0.0, make the selected build version available in the frontend bundle, and show it unobtrusively at the bottom of the main menu.

## Decision Summary

- The existing live deployment is the 1.0.0 baseline.
- Local builds use the canonical package version unless VITE_APP_VERSION is supplied by the release script.
- The menu label is v followed by the selected semantic version.

## Implementation

### I01. Canonical package version and build-time constant

- Related Files:
  - package.json :: root manifest version; modify
  - package-lock.json :: packages[""].version root lock metadata; modify
  - apps/web/vite.config.ts :: defineConfig; modify
  - apps/web/src/vite-env.d.ts :: global build constant declaration; modify

#### Details

- Add root package.json field version with value 1.0.0 beside name/private. Update package-lock root package version to the same value without changing resolved dependency versions.
- In vite.config.ts, read root package.json using Node built-ins and the config module URL; do not hard-code a second fallback version.
- Select non-empty process.env.VITE_APP_VERSION when present; otherwise use root package.json version.
- Add Vite define mapping __APP_VERSION__ to JSON.stringify(selectedVersion).
- Declare global const __APP_VERSION__: string in vite-env.d.ts.
- Preserve envDir and React plugin configuration.
- Fail Vite config loading with an actionable message if root version is missing or does not match non-negative MAJOR.MINOR.PATCH numeric components.

### I02. Main-menu version label

- Related Files:
  - apps/web/src/components/MainMenu.tsx :: MainMenu; modify
  - apps/web/src/styles/board.css :: .menu-card and .menu-note styling area; modify

#### Details

- Render a non-interactive span with class menu-version and text v followed by __APP_VERSION__ after the existing menu-note inside menu-card.
- Use small muted centered text with a small top margin. It must not look like an action or change button order.
- Do not display a fabricated deployment date or deployment count in the menu.

## Acceptance Criteria

- [ ] Root package and lock metadata identify the initial baseline as 1.0.0.
- [ ] Normal web build embeds canonical version; VITE_APP_VERSION override embeds the override.
- [ ] Main menu displays v1.0.0 at its bottom in small muted text.
- [ ] Existing menu actions, audio control, and responsive layout remain unchanged.

## Validation

- npm run build ??all workspaces compile successfully.
- Manual browser check: open local main menu and confirm version appears below the menu note.
- Override check: set VITE_APP_VERSION=9.8.7, build the web workspace, confirm generated bundle contains 9.8.7, then unset the variable.

## Commit Message

feat(version): show canonical app version in main menu

Plan: 2026-10-30-deployment-versioning
Phase: P01-versioned-swa-release
Task: T01-version-display

- Add root version 1.0.0 and expose a build-time version constant
- Display the version beneath the main-menu note

## Progress

- [x] Implementation complete
- [x] Validation complete
- commit: pending
