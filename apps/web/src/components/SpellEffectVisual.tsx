import type { CSSProperties } from "react";
import type { SpellVisualSpec } from "../game/spellEffectCatalog.js";
import { BURST_MOTIFS, GLYPHS, START_MOTIFS, TRAVEL_MOTIFS } from "../game/spellEffectMotifs.js";

export interface EffectPoint {
  x: number;
  y: number;
}

interface SpellEffectVisualProps {
  spec: SpellVisualSpec;
  source: EffectPoint;
  target: EffectPoint;
  paused: boolean;
  /** Delay before the effect starts, already multiplied by the slow-motion scale. */
  delayMs: number;
  slowMotion: boolean;
}

/** Share of the time before the impact that the start motif occupies; the rest is travel. */
export const START_SHARE = 0.45;

export function SpellEffectVisual({ spec, source, target, paused, delayMs, slowMotion }: SpellEffectVisualProps) {
  const scale = slowMotion ? 2 : 1;
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const startMs = Math.round(spec.impactAtMs * START_SHARE);
  const travelMs = spec.impactAtMs - startMs;
  const burstMs = spec.totalMs - spec.impactAtMs;
  const style = {
    left: source.x,
    top: source.y,
    "--fx-dx": `${dx}px`,
    "--fx-dy": `${dy}px`,
    "--fx-len": `${Math.hypot(dx, dy)}px`,
    "--fx-dy-mid": `${Math.round(dy * 0.35 - 58)}px`,
    "--fx-angle": `${(Math.atan2(dy, dx) * 180) / Math.PI}deg`,
    "--fx-primary": spec.palette.primary,
    "--fx-secondary": spec.palette.secondary,
    "--fx-glow": spec.palette.glow,
    "--fx-t-start": `${startMs * scale}ms`,
    "--fx-t-travel": `${travelMs * scale}ms`,
    "--fx-t-burst": `${burstMs * scale}ms`,
    "--fx-d-start": `${delayMs}ms`,
    "--fx-d-travel": `${delayMs + startMs * scale}ms`,
    "--fx-d-burst": `${delayMs + spec.impactAtMs * scale}ms`,
    "--fx-play": paused ? "paused" : "running",
  } as CSSProperties;
  const Start = START_MOTIFS[spec.motifs.start];
  const Travel = TRAVEL_MOTIFS[spec.motifs.travel];
  const Burst = BURST_MOTIFS[spec.motifs.burst];
  const glyph = GLYPHS[spec.glyph];
  const startAtTarget = spec.startAt === "target";

  return (
    <span className={`spell-fx${slowMotion ? " is-slow-motion" : ""}`} data-spell-fx={spec.id} style={style} aria-hidden="true">
      <span className={`spell-fx__start${startAtTarget ? " is-at-target" : ""}`}>
        {glyph ? <svg className="fx-glyph" viewBox="0 0 64 64" width="64" height="64" focusable="false">{glyph}</svg> : null}
        {Start?.()}
      </span>
      <span className="spell-fx__travel">{Travel?.()}</span>
      <span className="spell-fx__burst">{Burst?.()}</span>
    </span>
  );
}
