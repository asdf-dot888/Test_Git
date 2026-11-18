import type { SoundRecipe } from "../soundRecipes.js";
import type { SpellVisualSpec } from "../spellEffectCatalog.js";

/** Hero powers and class spells (P02-T01): 3 + 9 effects, all `normal` weight. */

export const HERO_AND_CLASS_SPECS: readonly SpellVisualSpec[] = [
  {
    id: "hero-power-warrior", weight: "normal", impactAtMs: 560, totalMs: 1120,
    palette: { primary: "#6fa8d6", secondary: "#20364d", glow: "#d7ecff" },
    motifs: { start: "gather", travel: "none", burst: "ring" }, glyph: "hero-power-warrior",
  },
  {
    id: "hero-power-assassin", weight: "normal", impactAtMs: 480, totalMs: 1040,
    palette: { primary: "#a24dff", secondary: "#1a0b2a", glow: "#ff6b8a" },
    motifs: { start: "sweep", travel: "lance", burst: "slash-cross" }, glyph: "hero-power-assassin",
  },
  {
    id: "hero-power-demonist", weight: "normal", impactAtMs: 620, totalMs: 1180,
    palette: { primary: "#ff7a2e", secondary: "#4a0f2b", glow: "#ffc16b" },
    motifs: { start: "sigil", travel: "none", burst: "portal" }, glyph: "hero-power-demonist", startAt: "target",
  },
  {
    id: "warrior-brace", weight: "normal", impactAtMs: 540, totalMs: 1100,
    palette: { primary: "#b8c4d6", secondary: "#3a4a5e", glow: "#ffffff" },
    motifs: { start: "circle", travel: "stream", burst: "ring" }, glyph: "warrior-brace",
  },
  {
    id: "warrior-hammerfall", weight: "normal", impactAtMs: 600, totalMs: 1160,
    palette: { primary: "#f2c14e", secondary: "#5b3a1a", glow: "#fff0b8" },
    motifs: { start: "flare", travel: "fall", burst: "crater" }, glyph: "warrior-hammerfall",
  },
  {
    id: "warrior-rally", weight: "normal", impactAtMs: 560, totalMs: 1140,
    palette: { primary: "#e8c15a", secondary: "#8c1d2c", glow: "#ffe9a8" },
    motifs: { start: "unfurl", travel: "stream", burst: "wave" }, glyph: "warrior-rally",
  },
  {
    id: "assassin-venom-coat", weight: "normal", impactAtMs: 540, totalMs: 1100,
    palette: { primary: "#7bd84a", secondary: "#123016", glow: "#d6ff9e" },
    motifs: { start: "rise", travel: "thread", burst: "mist" }, glyph: "assassin-venom-coat",
  },
  {
    id: "assassin-shuriken", weight: "normal", impactAtMs: 500, totalMs: 1060,
    palette: { primary: "#b9c3d6", secondary: "#1b2230", glow: "#7fb4ff" },
    motifs: { start: "shimmer", travel: "arc", burst: "shatter" }, glyph: "assassin-shuriken",
  },
  {
    id: "assassin-smoke-step", weight: "normal", impactAtMs: 560, totalMs: 1120,
    palette: { primary: "#9a93b8", secondary: "#2b2840", glow: "#e4dcff" },
    motifs: { start: "sweep", travel: "none", burst: "mist" }, glyph: "assassin-smoke-step", focusEffectKind: "draw",
  },
  {
    id: "demonist-dark-rite", weight: "normal", impactAtMs: 620, totalMs: 1180,
    palette: { primary: "#d1232f", secondary: "#2a0508", glow: "#ff8a7a" },
    motifs: { start: "circle", travel: "none", burst: "column" }, glyph: "demonist-dark-rite", startAt: "target",
  },
  {
    id: "demonist-hellfire", weight: "normal", impactAtMs: 580, totalMs: 1160,
    palette: { primary: "#ff5a1f", secondary: "#3a0d05", glow: "#ffb347" },
    motifs: { start: "gather", travel: "stream", burst: "column" }, glyph: "demonist-hellfire",
  },
  {
    id: "demonist-soul-bond", weight: "normal", impactAtMs: 560, totalMs: 1120,
    palette: { primary: "#d65cf0", secondary: "#0f4a4f", glow: "#7ff3e0" },
    motifs: { start: "shimmer", travel: "thread", burst: "chain" }, glyph: "demonist-soul-bond",
  },
];

export const HERO_AND_CLASS_RECIPES: readonly SoundRecipe[] = [
  {
    // Low metallic clank, a rising lock, and a bright ping.
    id: "hero-power-warrior", totalMs: 920,
    layers: [
      { wave: "square", startMs: 0, durationMs: 160, fromHz: 196, toHz: 150, gain: 0.34, filter: { type: "lowpass", fromHz: 1100, q: 1 } },
      { wave: "noise", startMs: 0, durationMs: 90, fromHz: 1, gain: 0.22, filter: { type: "highpass", fromHz: 3800 } },
      { wave: "sine", startMs: 220, durationMs: 420, fromHz: 330, toHz: 660, gain: 0.3, attackMs: 30 },
      { wave: "triangle", startMs: 560, durationMs: 360, fromHz: 880, gain: 0.22, attackMs: 8 },
    ],
  },
  {
    // Filtered whoosh with a falling saw and two crisp pings on the crossing cuts.
    id: "hero-power-assassin", totalMs: 620,
    layers: [
      { wave: "noise", startMs: 0, durationMs: 320, fromHz: 1, gain: 0.32, filter: { type: "bandpass", fromHz: 600, toHz: 2600, q: 1.2 } },
      { wave: "sawtooth", startMs: 0, durationMs: 260, fromHz: 1400, toHz: 300, gain: 0.22, filter: { type: "lowpass", fromHz: 3000 } },
      { wave: "square", startMs: 440, durationMs: 90, fromHz: 2200, gain: 0.2, attackMs: 4 },
      { wave: "square", startMs: 520, durationMs: 100, fromHz: 2900, gain: 0.18, attackMs: 4 },
    ],
  },
  {
    // Sub rumble that sweeps up, crackle, and a detuned growl as the imp rises.
    id: "hero-power-demonist", totalMs: 1060,
    layers: [
      { wave: "sine", startMs: 0, durationMs: 700, fromHz: 50, toHz: 90, gain: 0.45, attackMs: 200, filter: { type: "lowpass", fromHz: 220 } },
      { wave: "noise", startMs: 100, durationMs: 600, fromHz: 1, gain: 0.22, filter: { type: "bandpass", fromHz: 2500, q: 3 } },
      { wave: "sawtooth", startMs: 560, durationMs: 500, fromHz: 110, toHz: 70, gain: 0.3, detuneCents: 12, filter: { type: "lowpass", fromHz: 700, toHz: 300 } },
      { wave: "sawtooth", startMs: 560, durationMs: 500, fromHz: 112, toHz: 71, gain: 0.26, detuneCents: -12, filter: { type: "lowpass", fromHz: 700, toHz: 300 } },
    ],
  },
  {
    // Two metallic hits and a soft low thump.
    id: "warrior-brace", totalMs: 700,
    layers: [
      { wave: "square", startMs: 0, durationMs: 120, fromHz: 262, gain: 0.3, filter: { type: "lowpass", fromHz: 1500 } },
      { wave: "square", startMs: 150, durationMs: 120, fromHz: 392, gain: 0.3, filter: { type: "lowpass", fromHz: 1500 } },
      { wave: "sine", startMs: 300, durationMs: 400, fromHz: 90, toHz: 60, gain: 0.4, attackMs: 40 },
    ],
  },
  {
    // Falling whistle, then a heavy thud with a stone-crack noise burst.
    id: "warrior-hammerfall", totalMs: 1060,
    layers: [
      { wave: "sawtooth", startMs: 0, durationMs: 560, fromHz: 800, toHz: 300, gain: 0.18, filter: { type: "lowpass", fromHz: 2200 } },
      { wave: "sine", startMs: 560, durationMs: 500, fromHz: 90, toHz: 32, gain: 0.55, attackMs: 8 },
      { wave: "noise", startMs: 560, durationMs: 260, fromHz: 1, gain: 0.35, filter: { type: "lowpass", fromHz: 900 } },
      { wave: "noise", startMs: 600, durationMs: 160, fromHz: 1, gain: 0.25, filter: { type: "highpass", fromHz: 2500 } },
    ],
  },
  {
    // Brass-like saw chord that climbs a fifth, with a noise swell and a bright ping.
    id: "warrior-rally", totalMs: 860,
    layers: [
      { wave: "sawtooth", startMs: 0, durationMs: 520, fromHz: 262, toHz: 392, gain: 0.26, attackMs: 60, filter: { type: "lowpass", fromHz: 1800 } },
      { wave: "sawtooth", startMs: 0, durationMs: 520, fromHz: 392, toHz: 588, gain: 0.22, detuneCents: 6, attackMs: 60, filter: { type: "lowpass", fromHz: 1800 } },
      { wave: "noise", startMs: 300, durationMs: 500, fromHz: 1, gain: 0.18, attackMs: 250, filter: { type: "bandpass", fromHz: 1500 } },
      { wave: "triangle", startMs: 560, durationMs: 300, fromHz: 1047, gain: 0.18, attackMs: 8 },
    ],
  },
  {
    // Bubbling noise with three sine drips.
    id: "assassin-venom-coat", totalMs: 600,
    layers: [
      { wave: "noise", startMs: 0, durationMs: 600, fromHz: 1, gain: 0.3, filter: { type: "lowpass", fromHz: 700, toHz: 300 } },
      { wave: "sine", startMs: 150, durationMs: 90, fromHz: 1200, toHz: 700, gain: 0.25, attackMs: 4 },
      { wave: "sine", startMs: 300, durationMs: 80, fromHz: 1500, toHz: 900, gain: 0.22, attackMs: 4 },
      { wave: "sine", startMs: 450, durationMs: 110, fromHz: 1000, toHz: 600, gain: 0.24, attackMs: 4 },
    ],
  },
  {
    // Rapid triangle whirr followed by three short ticks.
    id: "assassin-shuriken", totalMs: 560,
    layers: [
      { wave: "triangle", startMs: 0, durationMs: 400, fromHz: 700, toHz: 1500, gain: 0.24, detuneCents: 8 },
      { wave: "square", startMs: 380, durationMs: 40, fromHz: 3000, gain: 0.2, attackMs: 2 },
      { wave: "square", startMs: 440, durationMs: 40, fromHz: 2400, gain: 0.2, attackMs: 2 },
      { wave: "square", startMs: 500, durationMs: 40, fromHz: 3400, gain: 0.2, attackMs: 2 },
    ],
  },
  {
    // Soft breathy burst and a descending whisper.
    id: "assassin-smoke-step", totalMs: 840,
    layers: [
      { wave: "noise", startMs: 0, durationMs: 500, fromHz: 1, gain: 0.28, attackMs: 150, filter: { type: "bandpass", fromHz: 1800, toHz: 700 } },
      { wave: "sine", startMs: 100, durationMs: 600, fromHz: 600, toHz: 180, gain: 0.2, attackMs: 80 },
      { wave: "triangle", startMs: 540, durationMs: 300, fromHz: 330, gain: 0.12, attackMs: 40 },
    ],
  },
  {
    // Chant-like detuned sines over a low drone, crackle, and a rising imp call.
    id: "demonist-dark-rite", totalMs: 1020,
    layers: [
      { wave: "sine", startMs: 0, durationMs: 800, fromHz: 196, gain: 0.22, detuneCents: -15, attackMs: 200 },
      { wave: "sine", startMs: 0, durationMs: 800, fromHz: 196, gain: 0.22, detuneCents: 15, attackMs: 200 },
      { wave: "sine", startMs: 0, durationMs: 900, fromHz: 98, gain: 0.3, attackMs: 250, filter: { type: "lowpass", fromHz: 300 } },
      { wave: "noise", startMs: 400, durationMs: 400, fromHz: 1, gain: 0.15, filter: { type: "bandpass", fromHz: 3000 } },
      { wave: "sawtooth", startMs: 620, durationMs: 400, fromHz: 392, toHz: 196, gain: 0.18, filter: { type: "lowpass", fromHz: 1400 } },
    ],
  },
  {
    // Rising fire roar, then a deep thud and a burst of noise.
    id: "demonist-hellfire", totalMs: 1030,
    layers: [
      { wave: "sawtooth", startMs: 0, durationMs: 560, fromHz: 80, toHz: 240, gain: 0.3, filter: { type: "lowpass", fromHz: 900, toHz: 2400 } },
      { wave: "noise", startMs: 0, durationMs: 760, fromHz: 1, gain: 0.3, attackMs: 300, filter: { type: "lowpass", fromHz: 1500, toHz: 3500 } },
      { wave: "sine", startMs: 580, durationMs: 450, fromHz: 70, toHz: 30, gain: 0.5, attackMs: 8 },
      { wave: "noise", startMs: 580, durationMs: 300, fromHz: 1, gain: 0.3, filter: { type: "bandpass", fromHz: 900 } },
    ],
  },
  {
    // Two glassy triangles beating against each other with a shimmer of high noise.
    id: "demonist-soul-bond", totalMs: 860,
    layers: [
      { wave: "triangle", startMs: 0, durationMs: 700, fromHz: 784, gain: 0.2, detuneCents: 8, attackMs: 100 },
      { wave: "triangle", startMs: 0, durationMs: 700, fromHz: 784, gain: 0.2, detuneCents: -8, attackMs: 100 },
      { wave: "noise", startMs: 300, durationMs: 500, fromHz: 1, gain: 0.1, attackMs: 150, filter: { type: "highpass", fromHz: 6000 } },
      { wave: "sine", startMs: 560, durationMs: 300, fromHz: 1568, gain: 0.16, attackMs: 20 },
    ],
  },
];
