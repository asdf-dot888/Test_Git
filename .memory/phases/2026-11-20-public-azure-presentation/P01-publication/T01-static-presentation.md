# Task: T01 Static Presentation

## Status: done

## Goal
Make the completed 12-slide HTML deck part of every future Mango Stone Vite build at `/presentation/`.

## Decision Summary
- Copy the self-contained HTML from `/Users/gimjinhyeon/Downloads/mango-stone-presentation.html` into Vite's public directory.
- Keep the game root, routes, scripts, and API unchanged.

## Implementation
### I01. Static asset
- Related Files:
  - `apps/web/public/presentation/index.html` :: document root and inline `showSlide`, `nextSlide`, `prevSlide`, `cycleTheme`, `downloadImage` functions; new
- Signatures & Types: HTML document; no application TypeScript types or exports.
- Data & Schema Fields: no persisted data. Twelve sections have IDs `slide-1` through `slide-12`; art is embedded as data URIs.
- Execution Flow: Vite copies this file to `dist/presentation/index.html`; Azure serves it as a static file.
- Error Handling: stop before commit if the file is missing from `dist`, slide count differs, or build fails.

## Acceptance Criteria
- [x] Source and built files exist and are byte-identical.
- [x] The normal game `index.html` and `staticwebapp.config.json` still exist.

## Validation
- `npm run build --workspace @board-game/web` — TypeScript check and Vite production build.
- `cmp apps/web/public/presentation/index.html apps/web/dist/presentation/index.html` — exact static copy.

## Commit Message
```text
feat(presentation): add public Azure slide deck

Plan: 2026-11-20-public-azure-presentation
Phase: P01-publication
Task: T01-static-presentation

- Keep the self-contained HTML deck in Vite public assets.
- Preserve the game and API routes.
```

## Progress
- [x] implementation complete
- [x] validation passed
- commit: pending
