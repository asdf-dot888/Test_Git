# Decisions: Combat Sound Cues

- Date: 2026-10-30
- Status: Confirmed

## Goal

Give attacks, spells, hero powers, and enemy phase themes distinct synthesized sound cues while keeping combat audio aligned with the existing visual event sequence and impact sounds.

## Confirmed decisions

### D01. Player minion attack sound
- **Chosen**: Select the attack cue from the attacking card's class: warrior uses a heavy weapon sound, assassin a quick blade slash, and demonist a magical attack sound. Neutral/common cards use a separate neutral attack cue.
- **Rationale**: Class identity should be audible while neutral cards remain distinct from class cards.

### D02. Enemy attack sound
- **Chosen**: Regular enemy minion attacks use a phase-themed cue. Boss attacks have a separate cue for each phase.
- **Rationale**: Enemy attacks should communicate the encounter theme, with bosses carrying greater identity.

### D03. Attack and impact layering
- **Chosen**: Play the attacker-specific attack sound alongside the existing damage-tier impact sound.
- **Rationale**: The attack cue identifies the attacker; the impact cue communicates damage severity and target response.

### D04. Spell sound groups
- **Chosen**: Group spell cues by effect type:
  - damage and random damage: offensive magic
  - cleave: blade magic
  - healing: healing magic
  - summon: summoning magic
  - buff: rune magic
  - draw, discard, and taking a card from the opponent's deck: soul/card manipulation magic
  - mana gain: mana magic
- **Rationale**: This distinguishes the gameplay effect without requiring a unique sound for every card.

### D05. Spell impacts
- **Chosen**: Damage spells play their effect-group cast cue first, followed by the existing damage-tier or boss-area impact cue when damage resolves.
- **Rationale**: Keep spell identity and the weight of the hit separately audible.

### D06. Enemy spell themes
- **Chosen**: Enemy spells use their effect-group cue with the current phase's sound character. Resolved damage continues to use the existing impact rules.
- **Rationale**: Spell behavior remains legible while enemy actions retain their phase identity.

### D07. Composite spells
- **Chosen**: Play each effect's cue as that effect resolves, in the same order as its visual/combat resolution. Do not play every cue simultaneously or omit later effect cues.
- **Rationale**: The sound sequence should explain multi-effect cards in the same order the player sees their effects.

### D08. Hero powers
- **Chosen**: Share the sound family that matches the action: warrior armor, assassin blade, and demonist summon.
- **Rationale**: Hero powers should sound like their actual action and remain consistent with related card effects.

### D09. Asset generation
- **Chosen**: Generate sound files with a code script and include the generated WAV assets in the game.
- **Rationale**: This follows the existing generated-menu-music approach and keeps playback consistent across browsers.

## Existing implementation constraints and conventions

- Combat presentation is event-driven in `apps/web/src/game/combatEffects.ts`; events carry card IDs, effect kinds, damage outcomes, phase data, and sound cues.
- `combatEventSounds` currently preserves cast/death cues and replaces generic damage cues with the resolved damage-tier, armor-block, hero-melee, or boss-area impact sound.
- Existing sound routing is centralized in `apps/web/src/game/audio.ts`; current files live under `apps/web/public/audio/sfx/`.
- Card definitions expose optional `classId` values (`warrior`, `assassin`, `demonist`); cards without one can use the neutral attack cue.
- Current enemy combat events know the encounter phase, and boss-area impacts already have a dedicated sound path.
- A generated-menu-BGM script exists at `apps/web/scripts/generate-menu-bgm.mjs`, providing a local precedent for deterministic audio asset generation.

## Scope boundaries and follow-up notes

- This decision covers the existing PvE combat flow. PvP remains deferred as recorded in `.memory/decisions/2026-10-29-pvp.md`; do not imply PvP support until that mode is implemented.
- Keep existing damage-tier, armor-block, hero-melee, boss-area, and death cues unless implementation reveals a direct conflict with the chosen layering.
- Exact synthesis parameters and final sound design are implementation details; preserve distinct recognizable cues and prevent simultaneous multi-effect playback from masking the ordered sequence.
- No implementation or validation has been performed as part of this interview.
