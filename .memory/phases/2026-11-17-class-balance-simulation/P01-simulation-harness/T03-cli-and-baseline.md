# Task: T03 CLI, Report, and Baseline

## Status: todo

## Goal
Expose the simulator through an npm script, render a Markdown balance report, and record the unmodified baseline measurement that P02 tunes against.

## Decision Summary
- Reports are Markdown under `docs/balance/`.
- Run counts are chosen from measured speed; the target is completion-rate noise (95% half-width) of about 3pp or better per cell, using the per-battle metric as backup.

## Implementation
### I01. Report rendering
- `packages/game-core/src/balance/report.ts` (new)
  - `export function renderReport(cells: CellSummary[], meta: { generatedFor: string; baseSeed: number; runs: number; gameCommit: string }): string`
    - Sections: summary table (class x difficulty: completion %, CI, mean battles cleared, per-battle win %), per-encounter win-rate table (12 columns), gap verdict per difficulty using `classGap`, and a notes line stating which metric judged.
### I02. CLI
- `packages/game-core/src/balance/cli.ts` (new)
  - Flags: `--runs <n>` (default from measurement), `--seed <n>` (default 20261117), `--class <id|all>`, `--difficulty <normal|hard|all>`, `--out <path>` (write Markdown; otherwise print), `--label <text>`.
  - Parse with plain `process.argv` (no new dependency); invalid flags exit with code 1 and a usage message. Print progress per cell to stderr.
  - Resolve the git commit with `child_process.execFileSync("git", ["rev-parse", "--short", "HEAD"])`, falling back to `unknown`.
### I03. npm script
- `package.json` (root) `scripts`: add `"balance:sim": "npm run build --workspace @board-game/game-core && node packages/game-core/dist/balance/cli.js"`.
- Do not add the script to `build`, `test`, or deployment flows.
### I04. Tests
- `packages/game-core/src/balance/report.test.ts` (new): `renderReport` contains each class name, both difficulties, the verdict line, and is stable for a fixed input.
### I05. Baseline
- Time a small run first: `npm run balance:sim -- --runs 20 --out <scratch>`; derive a per-run cost and choose `--runs` so the full baseline finishes in a reasonable time (state the chosen value in the report).
- Generate the baseline from the current, untouched catalog: `npm run balance:sim -- --runs <n> --label baseline --out docs/balance/2026-11-17-baseline.md`.
- Verify the web bundle excludes the bot: after `npm run build`, search `apps/web/dist` for the string `playBotTurn` and expect no match.

## Acceptance Criteria
- [ ] `npm run balance:sim` produces a complete Markdown report for all classes and both difficulties.
- [ ] `docs/balance/2026-11-17-baseline.md` committed with the chosen run count and seed.
- [ ] Web bundle does not contain bot code.
- [ ] Existing tests still pass.

## Validation
- `npm test -- packages/game-core/src/balance`
- `npm test`
- `npm run lint`
- `npm run build`
- `npm run balance:sim -- --runs 20 --out <scratch path>` (smoke)

## Commit Message
```text
feat(balance): add simulation CLI and record baseline report

Plan: 2026-11-17-class-balance-simulation
Phase: P01-simulation-harness
Task: T03-cli-and-baseline
```

## Progress
- [ ] implementation complete
- [ ] validation passed
- commit: pending
