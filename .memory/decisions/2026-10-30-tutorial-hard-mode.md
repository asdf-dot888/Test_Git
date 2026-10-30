# Decisions: First-Run Tutorial and Hard Expedition Mode

- Date: 2026-10-30
- Status: Confirmed
- Scope: Add a guided first-run tutorial, a separate very difficult expedition mode, boss-specific hard-mode cards and attack warnings, and difficulty-separated leaderboard views. Season 2 content is explicitly deferred.

## D01. Guided first-run tutorial
- **Chosen**: During the player's first expedition, guide them through the actual first battle in short steps covering the hand, playing a card, attacking, and ending the turn.
- **Chosen**: Only the action requested by the current tutorial step is allowed until that step is completed. The player can skip the tutorial at any time.
- **Chosen**: Store tutorial completion per signed-in user in this browser. Skipping counts as completion, and the main menu's game guide can start the tutorial again.
- **Rationale**: The player learns the real game flow with focused guidance while retaining an immediate way to leave it.

## D02. Expedition difficulty selection
- **Chosen**: Before each expedition, let the player choose Normal or Hard. Lock the selected mode for that expedition.
- **Chosen**: Keep the current Normal mode behavior unchanged. Hard mode applies throughout the expedition; ordinary enemies are strengthened and bosses receive unique powerful cards.
- **Chosen**: Increase enemy hero health by 3 in ordinary battles and by 5 in boss battles in Hard mode. Keep mana rules unchanged.
- **Rationale**: Players can opt into a substantially harder run without changing the existing baseline experience.

## D03. Hard-mode enemy AI
- **Chosen**: Strengthen AI decisions substantially in Hard mode. The AI may inspect the player's hidden hand and deck order and use that information when choosing plays and targets.
- **Rationale**: Hard mode is intentionally allowed to feel unfair and punishing.

## D04. Boss cards and area-attack pattern
- **Chosen**: Add 3 unique powerful cards to each boss's deck and let the boss draw and use them randomly during the battle.
- **Chosen**: Differentiate each boss's card effects by phase theme:
  - Phase 1 corrupted elf queen: roots, curses, and cursed-forest control.
  - Phase 2 demon lord: demon summons and soul-cost effects.
  - Phase 3 ancient dragon: fire, burning damage over time, and large-scale damage.
- **Chosen**: In Hard mode, bosses use their area-attack pattern every 2 turns. Show a prominent warning that the boss is attacking, without revealing the attack's full details.
- **Rationale**: Bosses become recognizable threats with distinct mechanics, while the warning gives the player a moment to react without disclosing the exact attack.

## D05. Difficulty-separated leaderboard
- **Chosen**: Add Normal and Hard tabs at the top of the existing leaderboard view. Each tab shows the top 10 players by best progress for that difficulty.
- **Chosen**: Keep each player's best progress separate between the two difficulties.
- **Rationale**: Players can compare runs with the same difficulty rules, and Normal results remain distinct from the new Hard mode.

## D06. Season 2 deferred
- **Chosen**: Do not design or implement Season 2 in this work. Record it as a future topic to resume when the user brings it up again.
- **Rationale**: The current work is limited to tutorial and Hard mode; Season 2 needs its own content decisions later.

## Existing implementation notes
- A manually opened game-guide modal already exists in `apps/web/src/components/GameGuideModal.tsx`; it covers basic phase, mana, card, and victory rules.
- The current expedition has three phase themes: corrupted elves and a cursed forest, demons, and ancient dragons with a fire legion.
- The existing leaderboard records highest expedition progress and displays up to 10 players.
- Enemy AI and boss area attacks already exist; hard mode must keep Normal behavior intact and apply its changes through difficulty-aware rules.
- The signed-in user identity is available through Entra ID. Tutorial completion should remain browser-local and be keyed by that identity.

## Explicitly left for implementation planning
- The exact tutorial step conditions, copy, and input-lock handling for each step.
- The ordinary enemy stat and behavior adjustments beyond the confirmed enemy-hero health increases.
- The exact names, costs, stats, text, targeting, and implementation of the 9 boss-only cards.
- The exact Hard-mode AI scoring and how hidden hand/deck information influences each decision.
- Whether Normal-mode boss area attacks retain their current cadence; the every-2-turn cadence is specifically required for Hard mode.
- The leaderboard API/storage changes needed to persist and query independent Normal and Hard records.

## Out of scope
- Season 2 phases, story, enemies, bosses, cards, art, and balance.
- Implementation, deployment, and Azure configuration are not included in this decision record.
