# Decisions: Public Azure Presentation

- Date: 2026-11-20
- Status: Confirmed from the user's request and existing deployment configuration

## D01. Hosting
- Publish the completed, self-contained HTML presentation through the existing Azure Static Web Apps production site at `/presentation/`.
- The current SWA already serves the public game at `https://mango-stone-0631f0d00.5.azurestaticapps.net` and its static routes do not require SWA authentication. This path adds a public page without replacing the game root or managed Functions API.

## D02. Source and release
- Keep the presentation source at `apps/web/public/presentation/index.html`, so future Vite builds retain it.
- Use the established production release process and advance the patch version from 1.0.6 to 1.0.7 after a verified Azure upload. Stage only files in this plan; preserve unrelated untracked work.

## D03. Verification
- Check the built presentation file, main game page, and unauthenticated leaderboard API response after deployment. The presentation must return HTML without an Entra sign-in redirect.
- The existing private Sites deployment should be removed separately. The available Sites connector exposes no delete or unpublish operation, so avoid claiming removal until independently verified.
