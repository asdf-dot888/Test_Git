# Decisions: Damage-Scaled Combat Impact and Boss Area Effects

- Date: 2026-10-29
- Status: Confirmed

## D01. Damage-based impact intensity
- **Chosen**: Scale hit presentation by the damage that reaches a target's health, after armor absorption but before clamping damage to the target's remaining health. Use three tiers: 1–2 damage is light, 3–4 is medium, and 5 or more is heavy. A zero-damage random result is a miss.
- **Rationale**: The visual and audio impact should match what that target actually lost, including damage spells and attacks. Multi-target effects are evaluated separately for each target.

## D02. Strength separation between tiers
- **Chosen**: Make the three tiers visibly distinct, with substantially larger impact visuals, stronger flashes, and stronger shake as damage increases. Heavy hits should feel dramatically stronger than light hits. Boss area attacks have their own larger presentation regardless of per-target damage.
- **Rationale**: Small differences would not communicate the requested weight and intensity clearly.

## D03. Minion retaliation
- **Chosen**: When minions exchange damage, the damage reflected onto the attacking minion uses a small, fixed visual effect and a small, fixed hit sound, regardless of its damage amount.
- **Rationale**: Keep the return hit legible without competing with the primary impact.

## D04. Hero and minion hit presentation
- **Chosen**: Minions receive a localized impact and blood splatter at their position. Heroes receive a stronger red screen flash and stronger screen shake as damage increases. When a minion directly hits a hero, use a distinct short red slash/impact around the hero portrait and its own heavy hit sound, separate from the boss area-attack treatment. A lethal hit also uses the existing separate death sound.
- **Rationale**: Target type and attack source should be immediately readable while damage tiers still communicate severity.

## D05. Zero-damage result
- **Chosen**: Keep the spell-cast presentation, then show the projectile or magic missing near its target and breaking into small magical fragments. Do not show hit flash, target shake, or hit sound. If positive damage is fully absorbed by armor, show a small metallic spark at the hero and play a short block sound instead of treating it as a miss.
- **Rationale**: A zero-damage roll should read as a miss rather than a successful hit or an unexplained lack of feedback.

## D06. Damage sound tiers
- **Chosen**: Create distinct light, medium, heavy, and boss-area sound files by processing the game's existing attack and damage audio, preserving the current sound palette. Heavy hits and boss area attacks use lower, weightier sounds.
- **Rationale**: Separate files provide clear sound differences while keeping the existing game's audio style.

## D07. Boss area warning and phase-specific casting
- **Chosen**: Keep a warning before a boss area attack, then play a distinct casting animation for each phase: phase 1 uses cursed forest roots, phase 2 uses a demonic red sigil and flames, and phase 3 uses an ancient dragon's sweeping fire wave. Follow the cast with a large field-wide impact, strong flash, and shake.
- **Rationale**: The attack should feel dangerous and memorable while reinforcing the established phase themes.

## D08. Scope and reduced-motion setting
- **Chosen**: Apply damage tiers to all damage sources on both sides, including minion/hero attacks, damage spells, and class abilities. Minion retaliation and boss area attacks keep their dedicated rules. Play the full enhanced effects even when the device requests reduced motion.
- **Rationale**: Keep combat feedback consistent for player and enemy actions and preserve the requested dramatic presentation.

## D09. Armor and overkill
- **Chosen**: Damage absorbed by armor does not increase the hit tier. Damage remaining after armor does increase the tier even when it exceeds the target's remaining health. If armor absorbs all positive damage, use the dedicated small armor-block effect and sound. A target killed by the hit additionally uses the separate death sound.
- **Rationale**: Armor protection should reduce the perceived health impact, while a powerful lethal blow should retain its forceful presentation.

## Implementation notes
- Existing combat effect events identify target type and boss area attacks, but do not yet carry actual damage amounts or distinguish a miss from a full armor block. The implementation will need to pass per-target damage, armor-absorbed amount, and the resulting outcome into the presentation layer. Random spell damage needs its resolved roll, including when its target dies.
- Existing audio has one attack clip, one damage clip, and a separate death clip. New light/medium/heavy, armor-block, direct-minion-to-hero, and boss-area clips need to be produced from the existing attack and damage sources; do not add an external sound library.
- Boss area attacks already have a red warning frame and a broad impact effect. Implementation should extend the existing flow with phase-specific casting, rather than adding a second competing warning system.
- No gameplay balance, damage calculation, card effects, or boss attack rules are changed by this polish.
