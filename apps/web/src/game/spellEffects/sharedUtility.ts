import type { SoundRecipe } from "../soundRecipes.js";
import type { SpellVisualSpec } from "../spellEffectCatalog.js";

/** Shared utility spells (P02-T03): heal, buff, summon, draw, mana, theft, and temporary mana. All `normal` weight. */

export const SHARED_UTILITY_SPECS: readonly SpellVisualSpec[] = [
  {
    id: "healing-mist", weight: "normal", impactAtMs: 540, totalMs: 1140,
    palette: { primary: "#6fe39a", secondary: "#0f3d2a", glow: "#eafff2" },
    motifs: { start: "rise", travel: "none", burst: "mist" }, glyph: "healing-mist",
  },
  {
    id: "life-thread", weight: "normal", impactAtMs: 580, totalMs: 1160,
    palette: { primary: "#ffd36b", secondary: "#6b4a14", glow: "#fff6d6" },
    motifs: { start: "shimmer", travel: "thread", burst: "bloom" }, glyph: "life-thread",
  },
  {
    id: "mana-spring", weight: "normal", impactAtMs: 520, totalMs: 1100,
    palette: { primary: "#4db8ff", secondary: "#0c2d5c", glow: "#cfeeff" },
    motifs: { start: "rise", travel: "stream", burst: "ring" }, glyph: "mana-spring",
  },
  {
    id: "soul-bargain", weight: "normal", impactAtMs: 540, totalMs: 1120,
    palette: { primary: "#ff9a3d", secondary: "#4a1b0b", glow: "#ffe08a" },
    motifs: { start: "gather", travel: "stream", burst: "shatter" }, glyph: "soul-bargain", focusEffectKind: "gainTemporaryMana",
  },
  {
    id: "raise-bones", weight: "normal", impactAtMs: 620, totalMs: 1180,
    palette: { primary: "#e8e0cc", secondary: "#4a3a28", glow: "#ffffff" },
    motifs: { start: "sigil", travel: "none", burst: "crater" }, glyph: "raise-bones", startAt: "target",
  },
  {
    id: "rune-surge", weight: "normal", impactAtMs: 540, totalMs: 1100,
    palette: { primary: "#ffb13d", secondary: "#5a2d0a", glow: "#fff0c2" },
    motifs: { start: "circle", travel: "arc", burst: "ring" }, glyph: "rune-surge",
  },
  {
    id: "dark-insight", weight: "normal", impactAtMs: 540, totalMs: 1120,
    palette: { primary: "#b36bff", secondary: "#1d1040", glow: "#e0c8ff" },
    motifs: { start: "flare", travel: "none", burst: "bloom" }, glyph: "dark-insight",
  },
  {
    id: "stolen-fate", weight: "normal", impactAtMs: 600, totalMs: 1160,
    palette: { primary: "#ff5fd2", secondary: "#2c0e3a", glow: "#ffe0f6" },
    motifs: { start: "gather", travel: "thread", burst: "chain" }, glyph: "stolen-fate",
  },
];

export const SHARED_UTILITY_RECIPES: readonly SoundRecipe[] = [
  {
    // Breathy noise swell with two gently rising sines and a sparkle.
    id: "healing-mist", totalMs: 850,
    layers: [
      { wave: "noise", startMs: 0, durationMs: 700, fromHz: 1, gain: 0.22, attackMs: 300, filter: { type: "bandpass", fromHz: 1200 } },
      { wave: "sine", startMs: 0, durationMs: 700, fromHz: 523, toHz: 659, gain: 0.18, attackMs: 200 },
      { wave: "sine", startMs: 150, durationMs: 700, fromHz: 784, toHz: 988, gain: 0.16, attackMs: 200 },
      { wave: "triangle", startMs: 540, durationMs: 260, fromHz: 2093, gain: 0.12, attackMs: 6 },
    ],
  },
  {
    // Five plucked notes climbing a short scale, with a soft glitter on the last.
    id: "life-thread", totalMs: 800,
    layers: [
      { wave: "triangle", startMs: 0, durationMs: 220, fromHz: 523, gain: 0.26, attackMs: 4 },
      { wave: "triangle", startMs: 120, durationMs: 220, fromHz: 587, gain: 0.26, attackMs: 4 },
      { wave: "triangle", startMs: 240, durationMs: 220, fromHz: 659, gain: 0.26, attackMs: 4 },
      { wave: "triangle", startMs: 360, durationMs: 220, fromHz: 784, gain: 0.26, attackMs: 4 },
      { wave: "triangle", startMs: 480, durationMs: 220, fromHz: 1047, gain: 0.26, attackMs: 4 },
      { wave: "noise", startMs: 500, durationMs: 300, fromHz: 1, gain: 0.08, filter: { type: "highpass", fromHz: 6000 } },
    ],
  },
  {
    // Water-drop plinks, a rising sweep, and a splash of filtered noise.
    id: "mana-spring", totalMs: 780,
    layers: [
      { wave: "sine", startMs: 0, durationMs: 120, fromHz: 1400, toHz: 700, gain: 0.24, attackMs: 4 },
      { wave: "sine", startMs: 140, durationMs: 110, fromHz: 1700, toHz: 900, gain: 0.24, attackMs: 4 },
      { wave: "sine", startMs: 260, durationMs: 130, fromHz: 1200, toHz: 600, gain: 0.24, attackMs: 4 },
      { wave: "sine", startMs: 300, durationMs: 400, fromHz: 300, toHz: 900, gain: 0.16, attackMs: 100 },
      { wave: "noise", startMs: 380, durationMs: 400, fromHz: 1, gain: 0.12, attackMs: 100, filter: { type: "bandpass", fromHz: 2000 } },
    ],
  },
  {
    // Paper-burn crackle, then three coin-like high pings.
    id: "soul-bargain", totalMs: 900,
    layers: [
      { wave: "noise", startMs: 0, durationMs: 520, fromHz: 1, gain: 0.26, attackMs: 60, filter: { type: "bandpass", fromHz: 3500, q: 2 } },
      { wave: "noise", startMs: 100, durationMs: 400, fromHz: 1, gain: 0.12, filter: { type: "highpass", fromHz: 6000 } },
      { wave: "triangle", startMs: 540, durationMs: 180, fromHz: 2349, gain: 0.2, attackMs: 3 },
      { wave: "triangle", startMs: 620, durationMs: 200, fromHz: 3136, gain: 0.18, attackMs: 3 },
      { wave: "triangle", startMs: 700, durationMs: 200, fromHz: 2637, gain: 0.16, attackMs: 3 },
    ],
  },
  {
    // Three dry knocks, a low earth sweep, and a dusty thump.
    id: "raise-bones", totalMs: 1020,
    layers: [
      { wave: "square", startMs: 0, durationMs: 70, fromHz: 180, gain: 0.3, attackMs: 2, filter: { type: "lowpass", fromHz: 700 } },
      { wave: "square", startMs: 140, durationMs: 70, fromHz: 150, gain: 0.3, attackMs: 2, filter: { type: "lowpass", fromHz: 700 } },
      { wave: "square", startMs: 280, durationMs: 70, fromHz: 210, gain: 0.3, attackMs: 2, filter: { type: "lowpass", fromHz: 700 } },
      { wave: "sine", startMs: 300, durationMs: 700, fromHz: 70, toHz: 45, gain: 0.4, attackMs: 200, filter: { type: "lowpass", fromHz: 150 } },
      { wave: "noise", startMs: 620, durationMs: 400, fromHz: 1, gain: 0.25, attackMs: 40, filter: { type: "lowpass", fromHz: 500 } },
    ],
  },
  {
    // Resonant beating sines with a bright tick and an overtone on impact.
    id: "rune-surge", totalMs: 920,
    layers: [
      { wave: "sine", startMs: 0, durationMs: 700, fromHz: 659, gain: 0.24, attackMs: 80 },
      { wave: "sine", startMs: 0, durationMs: 700, fromHz: 666, gain: 0.24, attackMs: 80 },
      { wave: "triangle", startMs: 520, durationMs: 80, fromHz: 1976, gain: 0.22, attackMs: 2 },
      { wave: "sine", startMs: 520, durationMs: 400, fromHz: 1318, gain: 0.14, attackMs: 20 },
    ],
  },
  {
    // Eerie detuned sines swelling open, then two card whooshes.
    id: "dark-insight", totalMs: 900,
    layers: [
      { wave: "sine", startMs: 0, durationMs: 800, fromHz: 233, gain: 0.2, detuneCents: -20, attackMs: 400 },
      { wave: "sine", startMs: 0, durationMs: 800, fromHz: 233, gain: 0.2, detuneCents: 20, attackMs: 400 },
      { wave: "sine", startMs: 200, durationMs: 700, fromHz: 349, gain: 0.12, attackMs: 350 },
      { wave: "noise", startMs: 500, durationMs: 150, fromHz: 1, gain: 0.2, filter: { type: "bandpass", fromHz: 2500 } },
      { wave: "noise", startMs: 640, durationMs: 150, fromHz: 1, gain: 0.18, filter: { type: "bandpass", fromHz: 3200 } },
    ],
  },
  {
    // Whispering noise sweep, a rising sine, and two light plucks as the card is caught.
    id: "stolen-fate", totalMs: 940,
    layers: [
      { wave: "noise", startMs: 0, durationMs: 620, fromHz: 1, gain: 0.24, attackMs: 200, filter: { type: "bandpass", fromHz: 800, toHz: 3200, q: 3 } },
      { wave: "sine", startMs: 100, durationMs: 500, fromHz: 440, toHz: 880, gain: 0.12, attackMs: 150 },
      { wave: "triangle", startMs: 600, durationMs: 250, fromHz: 1175, gain: 0.26, attackMs: 3 },
      { wave: "triangle", startMs: 690, durationMs: 250, fromHz: 1568, gain: 0.2, attackMs: 3 },
    ],
  },
];
