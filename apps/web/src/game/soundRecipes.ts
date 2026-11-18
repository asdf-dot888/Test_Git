/**
 * Synthesized sound layers for spell and hero power effects. A recipe is a short list of oscillator or
 * noise layers (pitch glide, envelope, optional filter) rendered with Web Audio at play time. The
 * synthesized layer is mixed with the existing CC0 sample cues; no audio files are involved.
 */

export type SynthWave = "sine" | "triangle" | "sawtooth" | "square" | "noise";

export interface SynthFilter {
  type: "lowpass" | "highpass" | "bandpass";
  fromHz: number;
  toHz?: number;
  q?: number;
}

export interface SynthLayer {
  wave: SynthWave;
  /** Offset from the start of the cue. */
  startMs: number;
  durationMs: number;
  /** Start pitch (ignored for noise). */
  fromHz: number;
  /** Optional glide target (ignored for noise). */
  toHz?: number;
  /** Peak gain of this layer before the master volume, 0..0.6. */
  gain: number;
  attackMs?: number;
  filter?: SynthFilter;
  detuneCents?: number;
}

export interface SoundRecipe {
  /** Same id as the matching spell visual. */
  id: string;
  totalMs: number;
  layers: readonly SynthLayer[];
}

export const SYNTH_LIMITS = { maxLayers: 6, maxGain: 0.6, maxTotalMs: 2000, minHz: 20, maxHz: 16000 } as const;
export const DEFAULT_ATTACK_MS = 12;

/** Registered recipes. Content tasks add one entry per effect id. */
export const SOUND_RECIPES: Readonly<Record<string, SoundRecipe>> = {};

let activeRecipes: Readonly<Record<string, SoundRecipe>> = SOUND_RECIPES;

export function getSoundRecipe(id: string | null | undefined): SoundRecipe | undefined {
  return id ? activeRecipes[id] : undefined;
}

/** Test-only: replaces the registry for the current module instance; pass `null` to restore it. */
export function __setSoundRecipesForTest(recipes: Readonly<Record<string, SoundRecipe>> | null): void {
  activeRecipes = recipes ?? SOUND_RECIPES;
}

const hzProblem = (hz: number) => !Number.isFinite(hz) || hz < SYNTH_LIMITS.minHz || hz > SYNTH_LIMITS.maxHz;

/** Returns a description of every limit the recipe breaks (empty when valid). */
export function soundRecipeProblems(recipe: SoundRecipe): string[] {
  const problems: string[] = [];
  const label = recipe.id;
  if (recipe.layers.length < 1 || recipe.layers.length > SYNTH_LIMITS.maxLayers) problems.push(`${label}: needs 1..${SYNTH_LIMITS.maxLayers} layers`);
  if (recipe.totalMs <= 0 || recipe.totalMs > SYNTH_LIMITS.maxTotalMs) problems.push(`${label}: totalMs ${recipe.totalMs} is outside 1..${SYNTH_LIMITS.maxTotalMs}`);
  recipe.layers.forEach((layer, index) => {
    const at = `${label} layer ${index}`;
    if (!(layer.gain > 0) || layer.gain > SYNTH_LIMITS.maxGain) problems.push(`${at}: gain ${layer.gain} is outside 0..${SYNTH_LIMITS.maxGain}`);
    if (layer.startMs < 0 || layer.durationMs <= 0) problems.push(`${at}: invalid start or duration`);
    if (layer.startMs + layer.durationMs > recipe.totalMs) problems.push(`${at}: ends after totalMs`);
    if (layer.wave !== "noise") {
      if (hzProblem(layer.fromHz) || (layer.toHz !== undefined && hzProblem(layer.toHz))) problems.push(`${at}: pitch outside ${SYNTH_LIMITS.minHz}..${SYNTH_LIMITS.maxHz} Hz`);
    }
    if (layer.filter && (hzProblem(layer.filter.fromHz) || (layer.filter.toHz !== undefined && hzProblem(layer.filter.toHz)))) problems.push(`${at}: filter outside ${SYNTH_LIMITS.minHz}..${SYNTH_LIMITS.maxHz} Hz`);
    if (layer.attackMs !== undefined && (layer.attackMs < 0 || layer.attackMs > layer.durationMs)) problems.push(`${at}: attack is longer than the layer`);
  });
  return problems;
}

/** Stable string of every audible parameter; equal fingerprints mean the same sound. */
export function recipeFingerprint(recipe: SoundRecipe): string {
  return JSON.stringify(recipe.layers.map((layer) => [
    layer.wave, layer.startMs, layer.durationMs, layer.fromHz, layer.toHz ?? null, layer.gain, layer.attackMs ?? DEFAULT_ATTACK_MS,
    layer.filter ? [layer.filter.type, layer.filter.fromHz, layer.filter.toHz ?? null, layer.filter.q ?? null] : null,
    layer.detuneCents ?? 0,
  ]));
}
