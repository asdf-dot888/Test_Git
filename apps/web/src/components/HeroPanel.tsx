import type { ReactNode } from "react";
import type { HeroState, PlayerSide } from "@board-game/game-core";
import { readDragPayload, type DropTarget } from "./dragInteractions.js";
import { formatDropTarget } from "./touchDrag.js";

interface HeroPanelProps {
  hero: HeroState;
  side: PlayerSide;
  artKey: string;
  name: string;
  targetable: boolean;
  /** A taunt minion shields this hero from the minion being aimed (shown dimmed). */
  blocked?: boolean;
  armor?: number;
  intentTarget?: boolean;
  heroPowerControl?: ReactNode;
  /** Rendered above the portrait of the player hero (the compact layout puts the end-turn button here). */
  topControl?: ReactNode;
  onSelectTarget(targetId: string): void;
  onDropTarget?(payload: NonNullable<ReturnType<typeof readDragPayload>>, target: DropTarget): void;
  /** Touch drag: outlines the enemy hero while it is a valid drop target. */
  dropHighlight?: "valid" | "hover" | null;
}

export function HeroPanel({ hero, side, artKey, name, targetable, blocked = false, armor = 0, intentTarget = false, heroPowerControl, topControl, onSelectTarget, onDropTarget, dropHighlight = null }: HeroPanelProps) {
  const isPlayer = side === "player";
  return (
    <section
      className={`hero-panel hero-${side}${targetable ? " is-targetable" : ""}${blocked ? " is-blocked-target" : ""}${intentTarget ? " is-intent-target" : ""}${dropHighlight ? " is-drop-valid" : ""}${dropHighlight === "hover" ? " is-drop-hover" : ""}`}
      data-effect-anchor={`hero:${side}`}
      {...(side === "enemy" ? { "data-drop-target": formatDropTarget({ kind: "hero", side: "enemy" }) } : {})}
      aria-label={`${name} 영웅`}
      onDragOver={(event) => { if (side === "enemy" && onDropTarget) event.preventDefault(); }}
      onDrop={(event) => {
        if (side !== "enemy" || !onDropTarget) return;
        const payload = readDragPayload(event);
        if (payload) { event.preventDefault(); onDropTarget(payload, { kind: "hero", side }); }
      }}
    >
      {targetable && <button className="hero-target-button" type="button" aria-label={`${name}을(를) 대상으로 선택`} onClick={() => onSelectTarget(hero.id)} />}
      {isPlayer && topControl}
      <div className="hero-portrait-wrap">
        <img className="hero-portrait" src={`/art/${isPlayer ? "heroes" : "enemies"}/${artKey}.png`} alt={`${name} 초상화`} />
        <span className="hero-side-mark" aria-hidden="true">{isPlayer ? "✦" : "☠"}</span>
      </div>
      <div className="hero-details">
        <span className="hero-label">{isPlayer ? "플레이어" : "적 영웅"}</span>
        <strong className="hero-name">{name}</strong>
        <span className="health-value" aria-label={`체력 ${hero.health}/${hero.maxHealth}`}>
          <span aria-hidden="true">♥</span> {hero.health}<small> / {hero.maxHealth}</small>
        </span>
        {isPlayer && armor > 0 && <span className="armor-value" aria-label={`방어도 ${armor}`}>⬟ {armor}</span>}
        <div className="health-track" aria-hidden="true">
          <span style={{ width: `${Math.max(0, Math.min(100, (hero.health / hero.maxHealth) * 100))}%` }} />
        </div>
        {isPlayer && heroPowerControl}
      </div>
    </section>
  );
}
