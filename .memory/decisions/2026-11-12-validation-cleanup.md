# Decisions: Validation Cleanup

- Date: 2026-11-12
- Status: Confirmed

## D01. Scope
- **Chosen**: Complete tests, lint, build, and feasible local mobile checks. Exclude deployment.
- **Rationale**: User requested all remaining work except deployment and no further questions.

## D02. Repair approach
- **Chosen**: Update stale test setup for current game flows, supply missing art from existing corresponding boss illustrations, and fix lint without suppressing rules.
- **Rationale**: Current game flow and spell targeting are intentional. Existing art suits the missing cards.

## D03. User edits
- **Chosen**: Preserve unrelated dirty files and the user-edited defeat animation duration/style.
- **Rationale**: The worktree contains preexisting changes.
