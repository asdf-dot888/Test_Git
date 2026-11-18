import type { SoundRecipe } from "../soundRecipes.js";
import type { SpellVisualSpec } from "../spellEffectCatalog.js";

/** Shared damage spells (P02-T02): four `normal` effects and three `large` ones (meteor-shard, soul-storm, eclipse). */

export const SHARED_DAMAGE_SPECS: readonly SpellVisualSpec[] = [
  {
    id: "shadow-bolt", weight: "normal", impactAtMs: 500, totalMs: 1050,
    palette: { primary: "#8a5cff", secondary: "#2b1654", glow: "#c9b4ff" },
    motifs: { start: "gather", travel: "bolt", burst: "shatter" }, glyph: "shadow-bolt",
  },
  {
    id: "soul-lance", weight: "normal", impactAtMs: 480, totalMs: 1040,
    palette: { primary: "#55e0ff", secondary: "#0b3a52", glow: "#e6fbff" },
    motifs: { start: "flare", travel: "lance", burst: "ring" }, glyph: "soul-lance",
  },
  {
    id: "fate-shard", weight: "normal", impactAtMs: 560, totalMs: 1120,
    palette: { primary: "#ff8bd5", secondary: "#3b2b6e", glow: "#fff1a8" },
    motifs: { start: "shimmer", travel: "arc", burst: "bloom" }, glyph: "fate-shard",
  },
  {
    id: "reaper-cleave", weight: "normal", impactAtMs: 560, totalMs: 1120,
    palette: { primary: "#e0283f", secondary: "#3a0b14", glow: "#ffd0c8" },
    motifs: { start: "sweep", travel: "none", burst: "slash-cross" }, glyph: "reaper-cleave",
  },
  {
    id: "meteor-shard", weight: "large", impactAtMs: 950, totalMs: 1850,
    palette: { primary: "#ff8a2a", secondary: "#3d1608", glow: "#fff0c2" },
    motifs: { start: "sweep", travel: "fall", burst: "crater" }, glyph: "meteor-shard",
  },
  {
    id: "soul-storm", weight: "large", impactAtMs: 1000, totalMs: 1900,
    palette: { primary: "#7dffb0", secondary: "#14313b", glow: "#e9fff4" },
    motifs: { start: "circle", travel: "stream", burst: "wave" }, glyph: "soul-storm", focusEffectKind: "damage",
  },
  {
    id: "eclipse", weight: "large", impactAtMs: 1100, totalMs: 1950,
    palette: { primary: "#f6d36b", secondary: "#05030a", glow: "#fff7d6" },
    motifs: { start: "circle", travel: "thread", burst: "bloom" }, glyph: "eclipse", startAt: "target",
  },
];

export const SHARED_DAMAGE_RECIPES: readonly SoundRecipe[] = [
  {
    // Fast descending saw zip, a noise pop on impact, and a soft thump.
    id: "shadow-bolt", totalMs: 750,
    layers: [
      { wave: "sawtooth", startMs: 0, durationMs: 480, fromHz: 1800, toHz: 260, gain: 0.26, filter: { type: "lowpass", fromHz: 3500, toHz: 900 } },
      { wave: "noise", startMs: 480, durationMs: 140, fromHz: 1, gain: 0.3, filter: { type: "bandpass", fromHz: 1200 } },
      { wave: "sine", startMs: 490, durationMs: 260, fromHz: 140, toHz: 70, gain: 0.38, attackMs: 6 },
    ],
  },
  {
    // Glassy rising triangle that ends in a sharp pierce tick.
    id: "soul-lance", totalMs: 570,
    layers: [
      { wave: "triangle", startMs: 0, durationMs: 440, fromHz: 600, toHz: 1800, gain: 0.24, attackMs: 30 },
      { wave: "sine", startMs: 440, durationMs: 90, fromHz: 2400, gain: 0.22, attackMs: 3 },
      { wave: "noise", startMs: 450, durationMs: 120, fromHz: 1, gain: 0.2, filter: { type: "highpass", fromHz: 5000 } },
    ],
  },
  {
    // Tumbling high sine arpeggio, then a shatter burst.
    id: "fate-shard", totalMs: 860,
    layers: [
      { wave: "sine", startMs: 0, durationMs: 120, fromHz: 1319, gain: 0.2, attackMs: 4 },
      { wave: "sine", startMs: 90, durationMs: 120, fromHz: 1760, gain: 0.2, attackMs: 4 },
      { wave: "sine", startMs: 180, durationMs: 120, fromHz: 1047, gain: 0.2, attackMs: 4 },
      { wave: "sine", startMs: 270, durationMs: 120, fromHz: 2093, gain: 0.2, attackMs: 4 },
      { wave: "noise", startMs: 560, durationMs: 300, fromHz: 1, gain: 0.3, filter: { type: "highpass", fromHz: 3000 } },
      { wave: "triangle", startMs: 560, durationMs: 200, fromHz: 2637, gain: 0.16, attackMs: 6 },
    ],
  },
  {
    // Low sweeping saw with a wide whoosh, then a heavy thud and cutting noise.
    id: "reaper-cleave", totalMs: 960,
    layers: [
      { wave: "sawtooth", startMs: 0, durationMs: 560, fromHz: 140, toHz: 70, gain: 0.3, filter: { type: "lowpass", fromHz: 600, toHz: 1400 } },
      { wave: "noise", startMs: 0, durationMs: 560, fromHz: 1, gain: 0.32, attackMs: 120, filter: { type: "bandpass", fromHz: 400, toHz: 3000 } },
      { wave: "noise", startMs: 560, durationMs: 260, fromHz: 1, gain: 0.35, filter: { type: "lowpass", fromHz: 1200 } },
      { wave: "sine", startMs: 560, durationMs: 400, fromHz: 80, toHz: 40, gain: 0.45, attackMs: 6 },
    ],
  },
  {
    // Rising rumble and a falling whistle build to a huge impact with a long noise tail.
    id: "meteor-shard", totalMs: 1800,
    layers: [
      { wave: "sine", startMs: 0, durationMs: 900, fromHz: 40, toHz: 110, gain: 0.4, attackMs: 400, filter: { type: "lowpass", fromHz: 300 } },
      { wave: "sine", startMs: 100, durationMs: 800, fromHz: 1400, toHz: 200, gain: 0.16, attackMs: 100 },
      { wave: "noise", startMs: 0, durationMs: 950, fromHz: 1, gain: 0.25, attackMs: 500, filter: { type: "lowpass", fromHz: 600, toHz: 2500 } },
      { wave: "sine", startMs: 950, durationMs: 850, fromHz: 70, toHz: 28, gain: 0.55, attackMs: 8 },
      { wave: "noise", startMs: 950, durationMs: 800, fromHz: 1, gain: 0.4, attackMs: 8, filter: { type: "lowpass", fromHz: 1800 } },
    ],
  },
  {
    // Layered howl and drone, crackling squares, and a bright whoosh swell on impact.
    id: "soul-storm", totalMs: 1800,
    layers: [
      { wave: "noise", startMs: 0, durationMs: 1000, fromHz: 1, gain: 0.3, attackMs: 400, filter: { type: "bandpass", fromHz: 500, toHz: 1800, q: 2 } },
      { wave: "sine", startMs: 0, durationMs: 1700, fromHz: 110, gain: 0.25, attackMs: 600 },
      { wave: "square", startMs: 600, durationMs: 60, fromHz: 2800, gain: 0.15, attackMs: 2 },
      { wave: "square", startMs: 700, durationMs: 50, fromHz: 3500, gain: 0.15, attackMs: 2 },
      { wave: "square", startMs: 820, durationMs: 60, fromHz: 2200, gain: 0.15, attackMs: 2 },
      { wave: "noise", startMs: 1000, durationMs: 800, fromHz: 1, gain: 0.3, attackMs: 200, filter: { type: "highpass", fromHz: 2000 } },
    ],
  },
  {
    // Deep sub swell, a bright corona sweep, a shimmer, and a long decaying impact.
    id: "eclipse", totalMs: 1950,
    layers: [
      { wave: "sine", startMs: 0, durationMs: 1100, fromHz: 30, toHz: 55, gain: 0.5, attackMs: 700 },
      { wave: "sine", startMs: 300, durationMs: 800, fromHz: 300, toHz: 2400, gain: 0.2, attackMs: 300 },
      { wave: "triangle", startMs: 1000, durationMs: 300, fromHz: 3200, gain: 0.15, attackMs: 40 },
      { wave: "noise", startMs: 1100, durationMs: 850, fromHz: 1, gain: 0.35, attackMs: 40, filter: { type: "lowpass", fromHz: 900 } },
      { wave: "sine", startMs: 1100, durationMs: 850, fromHz: 55, toHz: 24, gain: 0.5, attackMs: 8 },
    ],
  },
];
