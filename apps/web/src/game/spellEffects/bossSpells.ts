import type { SoundRecipe } from "../soundRecipes.js";
import type { SpellVisualSpec } from "../spellEffectCatalog.js";

/** Boss-only spells (P02-T04): all `large` (<= 2000 ms), themed by boss phase (forest, abyss, dragon). */

export const BOSS_SPELL_SPECS: readonly SpellVisualSpec[] = [
  {
    id: "matron-thorn-prison", weight: "large", impactAtMs: 900, totalMs: 1800,
    palette: { primary: "#5fbf4a", secondary: "#2a1a0c", glow: "#d6ffb0" },
    motifs: { start: "sigil", travel: "none", burst: "chain" }, glyph: "matron-thorn-prison", startAt: "target",
  },
  {
    id: "matron-wither-curse", weight: "large", impactAtMs: 950, totalMs: 1850,
    palette: { primary: "#6b8f3a", secondary: "#121a0c", glow: "#d0d9a8" },
    motifs: { start: "sweep", travel: "stream", burst: "mist" }, glyph: "matron-wither-curse",
  },
  {
    id: "grave-king-soul-tithe", weight: "large", impactAtMs: 900, totalMs: 1800,
    palette: { primary: "#d6a23a", secondary: "#2b0a0a", glow: "#ff6a4a" },
    motifs: { start: "gather", travel: "stream", burst: "portal" }, glyph: "grave-king-soul-tithe", focusEffectKind: "summon",
  },
  {
    id: "grave-king-pit-gate", weight: "large", impactAtMs: 1100, totalMs: 1950,
    palette: { primary: "#c4151f", secondary: "#1a0305", glow: "#ff9a5a" },
    motifs: { start: "circle", travel: "none", burst: "portal" }, glyph: "grave-king-pit-gate", startAt: "target",
  },
  {
    id: "grave-king-harvest", weight: "large", impactAtMs: 1000, totalMs: 1900,
    palette: { primary: "#9b6bff", secondary: "#0f3a2a", glow: "#b8ffd6" },
    motifs: { start: "sweep", travel: "thread", burst: "shatter" }, glyph: "grave-king-harvest", focusEffectKind: "soulHarvest",
  },
  {
    id: "void-titan-burning-mark", weight: "large", impactAtMs: 900, totalMs: 1800,
    palette: { primary: "#ff7a1a", secondary: "#3a1005", glow: "#ffd27a" },
    motifs: { start: "flare", travel: "lance", burst: "slash-cross" }, glyph: "void-titan-burning-mark",
  },
  {
    id: "void-titan-inferno", weight: "large", impactAtMs: 1000, totalMs: 1900,
    palette: { primary: "#ff6a1f", secondary: "#2a0a05", glow: "#fff2c8" },
    motifs: { start: "flare", travel: "stream", burst: "wave" }, glyph: "void-titan-inferno",
  },
  {
    id: "void-titan-flame-legion", weight: "large", impactAtMs: 1100, totalMs: 1950,
    palette: { primary: "#ffb02e", secondary: "#4a1408", glow: "#fff0b0" },
    motifs: { start: "sigil", travel: "none", burst: "column" }, glyph: "void-titan-flame-legion", startAt: "target",
  },
];

export const BOSS_SPELL_RECIPES: readonly SoundRecipe[] = [
  {
    // Wooden creaks and rustling, a sharp snap as the cage closes, and a dull thud.
    id: "matron-thorn-prison", totalMs: 1600,
    layers: [
      { wave: "square", startMs: 0, durationMs: 300, fromHz: 140, toHz: 110, gain: 0.26, filter: { type: "lowpass", fromHz: 500 } },
      { wave: "square", startMs: 220, durationMs: 300, fromHz: 170, toHz: 130, gain: 0.24, filter: { type: "lowpass", fromHz: 500 } },
      { wave: "noise", startMs: 0, durationMs: 900, fromHz: 1, gain: 0.2, attackMs: 300, filter: { type: "bandpass", fromHz: 2500, q: 2 } },
      { wave: "noise", startMs: 900, durationMs: 120, fromHz: 1, gain: 0.35, attackMs: 2, filter: { type: "highpass", fromHz: 3000 } },
      { wave: "sine", startMs: 900, durationMs: 700, fromHz: 80, toHz: 50, gain: 0.4, attackMs: 6 },
    ],
  },
  {
    // Two detuned saws sinking in pitch with a dry rustle, then a heavy wilting thud.
    id: "matron-wither-curse", totalMs: 1750,
    layers: [
      { wave: "sawtooth", startMs: 0, durationMs: 1000, fromHz: 330, toHz: 110, gain: 0.22, detuneCents: 10, filter: { type: "lowpass", fromHz: 1200, toHz: 300 } },
      { wave: "sawtooth", startMs: 0, durationMs: 1000, fromHz: 335, toHz: 112, gain: 0.2, detuneCents: -10, filter: { type: "lowpass", fromHz: 1200, toHz: 300 } },
      { wave: "noise", startMs: 200, durationMs: 900, fromHz: 1, gain: 0.18, attackMs: 300, filter: { type: "bandpass", fromHz: 3500 } },
      { wave: "noise", startMs: 950, durationMs: 800, fromHz: 1, gain: 0.3, filter: { type: "lowpass", fromHz: 800 } },
      { wave: "sine", startMs: 950, durationMs: 800, fromHz: 90, toHz: 40, gain: 0.4, attackMs: 8 },
    ],
  },
  {
    // Three coin ticks, then a low growl and a claw tearing out of the ground.
    id: "grave-king-soul-tithe", totalMs: 1700,
    layers: [
      { wave: "triangle", startMs: 0, durationMs: 100, fromHz: 2093, gain: 0.2, attackMs: 2 },
      { wave: "triangle", startMs: 150, durationMs: 100, fromHz: 2637, gain: 0.2, attackMs: 2 },
      { wave: "triangle", startMs: 300, durationMs: 100, fromHz: 3136, gain: 0.2, attackMs: 2 },
      { wave: "sawtooth", startMs: 600, durationMs: 1000, fromHz: 90, toHz: 60, gain: 0.3, attackMs: 200, filter: { type: "lowpass", fromHz: 500 } },
      { wave: "noise", startMs: 900, durationMs: 500, fromHz: 1, gain: 0.3, filter: { type: "bandpass", fromHz: 1000 } },
      { wave: "sine", startMs: 900, durationMs: 800, fromHz: 55, toHz: 30, gain: 0.45, attackMs: 8 },
    ],
  },
  {
    // Long sub rumble, choir-like detuned sines, and a burst when the gate opens.
    id: "grave-king-pit-gate", totalMs: 1950,
    layers: [
      { wave: "sine", startMs: 0, durationMs: 1100, fromHz: 35, toHz: 70, gain: 0.5, attackMs: 600 },
      { wave: "sine", startMs: 200, durationMs: 1100, fromHz: 220, gain: 0.16, detuneCents: -25, attackMs: 500 },
      { wave: "sine", startMs: 200, durationMs: 1100, fromHz: 220, gain: 0.16, detuneCents: 25, attackMs: 500 },
      { wave: "sine", startMs: 300, durationMs: 1000, fromHz: 330, gain: 0.1, attackMs: 500 },
      { wave: "noise", startMs: 1100, durationMs: 850, fromHz: 1, gain: 0.4, attackMs: 20, filter: { type: "lowpass", fromHz: 1000 } },
      { wave: "sine", startMs: 1100, durationMs: 850, fromHz: 60, toHz: 26, gain: 0.5, attackMs: 8 },
    ],
  },
  {
    // A draining downward sweep, then an upward heal shimmer after the harvest lands.
    id: "grave-king-harvest", totalMs: 1700,
    layers: [
      { wave: "sawtooth", startMs: 0, durationMs: 1000, fromHz: 1200, toHz: 150, gain: 0.24, filter: { type: "lowpass", fromHz: 3000, toHz: 400 } },
      { wave: "noise", startMs: 0, durationMs: 1000, fromHz: 1, gain: 0.2, attackMs: 200, filter: { type: "bandpass", fromHz: 2500, toHz: 500 } },
      { wave: "sine", startMs: 1000, durationMs: 700, fromHz: 400, toHz: 1600, gain: 0.2, attackMs: 100 },
      { wave: "triangle", startMs: 1200, durationMs: 400, fromHz: 2093, gain: 0.14, attackMs: 20 },
      { wave: "sine", startMs: 1000, durationMs: 600, fromHz: 70, toHz: 35, gain: 0.4, attackMs: 8 },
    ],
  },
  {
    // Crackling brand, a short dragon roar, a deep thud, and a sizzle.
    id: "void-titan-burning-mark", totalMs: 1700,
    layers: [
      { wave: "noise", startMs: 0, durationMs: 900, fromHz: 1, gain: 0.26, attackMs: 100, filter: { type: "bandpass", fromHz: 3000, q: 2 } },
      { wave: "sawtooth", startMs: 600, durationMs: 800, fromHz: 180, toHz: 90, gain: 0.3, filter: { type: "lowpass", fromHz: 900 } },
      { wave: "sine", startMs: 900, durationMs: 800, fromHz: 120, toHz: 50, gain: 0.45, attackMs: 8 },
      { wave: "noise", startMs: 900, durationMs: 300, fromHz: 1, gain: 0.2, filter: { type: "highpass", fromHz: 4000 } },
    ],
  },
  {
    // A broad roar that swells and fades, over a low rumble and a heavy impact.
    id: "void-titan-inferno", totalMs: 1900,
    layers: [
      { wave: "noise", startMs: 0, durationMs: 1100, fromHz: 1, gain: 0.32, attackMs: 500, filter: { type: "lowpass", fromHz: 500, toHz: 3500 } },
      { wave: "sine", startMs: 0, durationMs: 1100, fromHz: 45, toHz: 80, gain: 0.4, attackMs: 500 },
      { wave: "sawtooth", startMs: 300, durationMs: 900, fromHz: 100, toHz: 160, gain: 0.22, filter: { type: "lowpass", fromHz: 700, toHz: 1800 } },
      { wave: "noise", startMs: 1000, durationMs: 900, fromHz: 1, gain: 0.35, attackMs: 10, filter: { type: "lowpass", fromHz: 3500, toHz: 600 } },
      { wave: "sine", startMs: 1000, durationMs: 800, fromHz: 70, toHz: 30, gain: 0.5, attackMs: 8 },
    ],
  },
  {
    // Rising horn-like saws, two egg-crack ticks, and a flame whoosh as the whelps hatch.
    id: "void-titan-flame-legion", totalMs: 1950,
    layers: [
      { wave: "sawtooth", startMs: 0, durationMs: 1000, fromHz: 196, toHz: 392, gain: 0.26, attackMs: 300, filter: { type: "lowpass", fromHz: 1200, toHz: 2500 } },
      { wave: "sawtooth", startMs: 0, durationMs: 1000, fromHz: 197, toHz: 393, gain: 0.22, detuneCents: 12, attackMs: 300, filter: { type: "lowpass", fromHz: 1200, toHz: 2500 } },
      { wave: "square", startMs: 1000, durationMs: 50, fromHz: 1800, gain: 0.22, attackMs: 2 },
      { wave: "square", startMs: 1200, durationMs: 50, fromHz: 2300, gain: 0.22, attackMs: 2 },
      { wave: "noise", startMs: 1100, durationMs: 850, fromHz: 1, gain: 0.32, attackMs: 100, filter: { type: "bandpass", fromHz: 800, toHz: 3000 } },
    ],
  },
];
