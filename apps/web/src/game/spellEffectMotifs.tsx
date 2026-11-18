import type { CSSProperties, ReactNode } from "react";
import { HERO_AND_CLASS_GLYPHS } from "./spellEffects/heroAndClassGlyphs.js";
import { SHARED_DAMAGE_GLYPHS } from "./spellEffects/sharedDamageGlyphs.js";
import { SHARED_UTILITY_GLYPHS } from "./spellEffects/sharedUtilityGlyphs.js";
import { BOSS_SPELL_GLYPHS } from "./spellEffects/bossSpellsGlyphs.js";

/**
 * Procedural motif library for spell and hero power effects. Each motif is a handful of absolutely
 * positioned elements (<= 24) animated by the keyframes in `styles/spellEffects.css`, using only
 * transform and opacity. Effects combine one start, one travel, and one burst motif with a glyph.
 */

type DotVars = (index: number) => Record<string, string | number>;

/** Renders `count` identical elements with --i (index), --n (count) and --a (even angle) variables. */
function dots(count: number, className: string, vars?: DotVars): ReactNode[] {
  return Array.from({ length: count }, (_, index) => (
    <i
      key={index}
      className={className}
      style={{ "--i": index, "--n": count, "--a": `${(360 / count) * index}deg`, ...(vars?.(index) ?? {}) } as CSSProperties}
    />
  ));
}

const spread = (index: number, width: number, count: number) => ((index + 0.5) / count - 0.5) * width;

export type MotifRenderer = () => ReactNode;

export const START_MOTIFS: Readonly<Record<string, MotifRenderer>> = {
  /** Eight sparks converge on the caster. */
  gather: () => <>{dots(8, "fx-gather")}</>,
  /** Two counter-rotating rings with six rune ticks. */
  circle: () => <><b className="fx-circle" /><b className="fx-circle fx-circle--inner" />{dots(6, "fx-tick")}</>,
  /** Six motes rise from below. */
  rise: () => <>{dots(6, "fx-rise", (index) => ({ "--x": `${spread(index, 70, 6)}px` }))}</>,
  /** A crescent swish. */
  sweep: () => <><b className="fx-sweep" /><b className="fx-sweep fx-sweep--echo" /></>,
  /** Five twinkling stars. */
  shimmer: () => <>{dots(5, "fx-shimmer", (index) => ({ "--x": `${spread(index, 84, 5)}px`, "--y": `${((index * 37) % 5 - 2) * 14}px` }))}</>,
  /** A radial flare with four rays. */
  flare: () => <><b className="fx-flare" />{dots(4, "fx-ray")}</>,
  /** A flattened ground sigil with ticks. */
  sigil: () => <><b className="fx-sigil" /><b className="fx-sigil fx-sigil--inner" />{dots(6, "fx-sigil-tick")}</>,
  /** A banner unfurling with two side waves. */
  unfurl: () => <><b className="fx-unfurl" /><b className="fx-unfurl-wave" /><b className="fx-unfurl-wave fx-unfurl-wave--late" /></>,
};

export const TRAVEL_MOTIFS: Readonly<Record<string, MotifRenderer>> = {
  /** A streak with a short trail. */
  bolt: () => <><i className="fx-bolt" />{dots(3, "fx-bolt fx-bolt--trail", (index) => ({ "--i": index + 1 }))}</>,
  /** A thin piercing lance. */
  lance: () => <><i className="fx-lance" /><i className="fx-lance fx-lance--trail" style={{ "--i": 1 } as CSSProperties} /></>,
  /** An orb on a lobbed arc. */
  arc: () => <b className="fx-arc-x"><i className="fx-arc-y" /><i className="fx-arc-y fx-arc-y--trail" /></b>,
  /** A streak that falls onto the target from above. */
  fall: () => <><i className="fx-fall" /><i className="fx-fall-head" /></>,
  /** A line drawn from the caster to the target. */
  thread: () => <><i className="fx-thread" /><i className="fx-thread fx-thread--thin" /></>,
  /** Six motes streaming toward the target. */
  stream: () => <>{dots(6, "fx-stream")}</>,
  none: () => null,
};

export const BURST_MOTIFS: Readonly<Record<string, MotifRenderer>> = {
  /** Two expanding rings. */
  ring: () => <><b className="fx-ring" /><b className="fx-ring fx-ring--late" /></>,
  /** Eight shards flying outward. */
  shatter: () => <>{dots(8, "fx-shard")}<b className="fx-core" /></>,
  /** Two crossing slashes. */
  "slash-cross": () => <><i className="fx-slash" /><i className="fx-slash fx-slash--cross" /></>,
  /** A rising pillar with embers. */
  column: () => <><b className="fx-column" />{dots(6, "fx-ember", (index) => ({ "--x": `${spread(index, 44, 6)}px`, "--x2": `${spread(index, 66, 6)}px` }))}</>,
  /** A ground shock wave with dust. */
  wave: () => <><b className="fx-wave" /><b className="fx-wave fx-wave--late" />{dots(4, "fx-dust")}</>,
  /** Five soft drifting puffs. */
  mist: () => <>{dots(5, "fx-puff", (index) => ({ "--x": `${spread(index, 70, 5)}px`, "--x2": `${spread(index, 84, 5)}px`, "--y": `${(index % 2) * -10}px` }))}</>,
  /** A glowing core with eight outward sparkles. */
  bloom: () => <><b className="fx-core fx-core--soft" />{dots(8, "fx-spark")}</>,
  /** A cracked impact crater with debris. */
  crater: () => <><b className="fx-wave fx-wave--flat" />{dots(4, "fx-crack")}{dots(6, "fx-debris")}</>,
  /** An opening oval portal. */
  portal: () => <><b className="fx-portal" /><b className="fx-portal fx-portal--ring" /><b className="fx-portal fx-portal--core" /></>,
  /** Three linked rings closing in. */
  chain: () => <>{dots(3, "fx-link")}</>,
};

/** One unique SVG glyph per effect id (content batches live in `./spellEffects/`). */
export const GLYPHS: Readonly<Record<string, ReactNode>> = { ...HERO_AND_CLASS_GLYPHS, ...SHARED_DAMAGE_GLYPHS, ...SHARED_UTILITY_GLYPHS, ...BOSS_SPELL_GLYPHS };
