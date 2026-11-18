# Decisions: Unique Spell and Hero Power Effects (Visual and Sound)

- Date: 2026-11-18
- Status: Confirmed
- Related decisions: `2026-10-29-combat-impact-polish.md` (damage tiers, boss area attacks, reduced-motion rule)
- Scope: Battle-screen presentation only. No gameplay, balance, card effect, or save-format changes.

## D01. Direction
- **Chosen**: UI/UX and presentation improvements on the battle screen, focused on feel and impact, specifically spells and hero powers (existing damage-tier hit effects, armor block, misses, and boss area attacks are not redone).
- **Rationale**: Today every hero power shares one small generic effect (`hero-power`, 54px, only the accent color differs), and spells share per-kind impact styles plus a card-art flight.

## D02. Unique effect for every hero power and spell card
- **Chosen**: Each effect below gets its own dedicated visual AND its own sound:
  - 3 hero powers: warrior armor ("방패 다지기"), assassin strike ("그림자 습격"), demonist summon ("하급 악마 소환").
  - 15 shared spells: shadow-bolt, soul-lance, healing-mist, mana-spring, soul-bargain, raise-bones, rune-surge, dark-insight, meteor-shard, life-thread, soul-storm, eclipse, fate-shard, reaper-cleave, stolen-fate.
  - 9 class spells: warrior-brace, warrior-hammerfall, warrior-rally, assassin-venom-coat, assassin-shuriken, assassin-smoke-step, demonist-dark-rite, demonist-hellfire, demonist-soul-bond.
  - 9 boss-only spells (included): matron-thorn-prison, matron-wither-curse, grave-king-soul-tithe, grave-king-pit-gate, grave-king-harvest, void-titan-burning-mark, void-titan-inferno, void-titan-flame-legion (and matron-briar-guardian only if it is a spell; it is a minion, so it keeps its minion presentation).
- **Interpretation**: The same effect plays when the enemy casts a shared spell (effects are keyed by card id, not by caster). Boss spells keep their phase themes (forest, demon, dragon) and may reuse the existing boss presentation style as a base.
- **Total**: 3 + 24 player-side spell/hero-power effects plus the 8 boss spells.

## D03. Visual technology
- **Chosen**: Procedural CSS and inline SVG animations. No new image assets, no particle engine, no new dependencies.
- **Rationale**: Small, consistent with the existing combat effects, easy to adjust, and no asset generation tooling is available.
- **Constraint**: Animate `transform` and `opacity` where possible so mobile devices stay smooth.

## D04. How it fits the existing flow
- **Chosen**: Replace the card-art flight for spells and hero powers with a spell-specific start effect (for example a casting circle, gathering energy, or a shield forming) followed by the spell-specific effect at its target. Minion attacks, minion summons, and the existing damage-tier hit/armor/miss effects remain as they are.
- **Interpretation**: The existing hit result (damage tier, block, miss, death) still plays after the spell effect, so damage feedback stays consistent. Targets and effect events come from the same event data as today.

## D05. Timing
- **Chosen**: Normal spells and hero powers last about 1.2 seconds; large spells (eclipse, soul-storm, meteor-shard) and all boss spells last up to 2 seconds. Low-cost spells stay short and fast.
- **Rationale**: Keeps the current battle pace and does not lengthen enemy turns noticeably.

## D06. Sound
- **Chosen**: Each effect gets a unique sound built by mixing the existing CC0 sample (`spell.ogg`, `heal.ogg`, `attack.ogg`, `damage.ogg`, impact clips) with a real-time Web Audio synthesis layer (timbre, pitch, noise, envelope per effect).
- **Chosen**: No external sound library and no new audio files; FFmpeg is not required (it is not installed on this PC).
- **Interpretation**: Reuse the existing audio controller and its settings (volume, mute); the synthesized layers must respect them and stay silent when sound is off.

## D07. Accessibility and settings
- **Chosen**: Keep the established rule: the full effects play even when the device requests reduced motion (see `2026-10-29-combat-impact-polish.md` D08). Existing audio settings control the new sounds.

## D08. Out of scope
- New cards, spell balance, damage numbers, or turn rules.
- Rework of minion attack, damage-tier, armor-block, miss, boss area attack, hero defeat, and victory presentations.
- New menu or non-battle screens.

## Implementation notes
- Relevant code: `apps/web/src/game/combatEffects.ts` (`CombatEffectKind` has only attack, damage, heal, buff, mana, summon, draw, cleave, theft, fusion, hero-power, impact; `CardCombatVisualProfile`; `combatKindForSpellEffect`), `apps/web/src/components/CombatEffectLayer.tsx`, `apps/web/src/styles/board.css` (`.combat-effect-*`), `apps/web/src/game/audio.ts` (audio controller; already uses Web Audio oscillators for some cues).
- A mapping from card id (and hero power class) to an effect id is needed; unmapped cards must fall back to the current generic effect so nothing breaks.
- Tests: pure mapping tests (every listed card/hero power resolves to a unique effect id and a sound recipe), timing caps (<= 1.2 s normal, <= 2 s large/boss), and fallbacks; visuals are checked in the browser.
