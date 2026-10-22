import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { CombatAnchor, CombatEffectEvent } from "../game/combatEffects.js";

interface CombatEffectLayerProps {
  events: CombatEffectEvent[];
  onComplete(eventId: number): void;
}

interface Point {
  x: number;
  y: number;
}

interface EffectGeometry {
  source: Point;
  target: Point;
}

function anchorName(anchor: CombatAnchor): string {
  if (anchor.kind === "hero") return `hero:${anchor.side}`;
  if (anchor.kind === "minion") return `minion:${anchor.side}:${anchor.slot}`;
  return `hand:${anchor.slot}`;
}

function centerOf(element: HTMLElement): Point {
  const bounds = element.getBoundingClientRect();
  return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
}

function fallbackPoint(anchor: CombatAnchor): Point {
  const board = document.querySelector<HTMLElement>(".battle-board");
  const bounds = board?.getBoundingClientRect();
  if (anchor.kind === "hand") {
    const hand = document.querySelector<HTMLElement>(".hand-panel");
    return hand ? centerOf(hand) : { x: window.innerWidth / 2, y: window.innerHeight - 72 };
  }
  if (!bounds) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const y = anchor.kind === "hero"
    ? (anchor.side === "enemy" ? bounds.top + bounds.height * 0.2 : bounds.top + bounds.height * 0.8)
    : (anchor.side === "enemy" ? bounds.top + bounds.height * 0.32 : bounds.top + bounds.height * 0.68);
  const x = anchor.kind === "hero"
    ? bounds.left + bounds.width / 2
    : bounds.left + bounds.width * ((anchor.slot + 0.5) / 5);
  return { x, y };
}

function anchorPoint(anchor: CombatAnchor, event: CombatEffectEvent, isSource: boolean): Point {
  if (anchor.kind === "hand" && isSource && anchor.instanceId) {
    const card = [...document.querySelectorAll<HTMLElement>("[data-effect-instance-id]")]
      .find((element) => element.dataset.effectInstanceId === anchor.instanceId);
    if (card) return centerOf(card);
    return fallbackPoint(anchor);
  }
  const element = document.querySelector<HTMLElement>(`[data-effect-anchor="${anchorName(anchor)}"]`);
  return element ? centerOf(element) : fallbackPoint(anchor);
}

function EffectSprite({ event, index, onComplete }: { event: CombatEffectEvent; index: number; onComplete(id: number): void }) {
  const [geometry, setGeometry] = useState<EffectGeometry | null>(null);
  const completeRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useLayoutEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useLayoutEffect(() => {
    completeRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      setGeometry({
        source: anchorPoint(event.source, event, true),
        target: anchorPoint(event.target, event, false),
      });
    });
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const timeout = window.setTimeout(() => {
      if (completeRef.current) return;
      completeRef.current = true;
      onCompleteRef.current(event.id);
    }, (reducedMotion ? 220 : 950) + Math.min(index, 8) * 120);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [event, index]);

  if (!geometry) return null;
  const delay = Math.min(index, 8) * 120;
  const style = {
    left: geometry.source.x,
    top: geometry.source.y,
    "--effect-dx": `${geometry.target.x - geometry.source.x}px`,
    "--effect-dy": `${geometry.target.y - geometry.source.y}px`,
    animationDelay: `${delay}ms`,
  } as CSSProperties;
  const isCardSource = event.source.kind === "hand" || event.source.kind === "minion";
  const cardArt = isCardSource && event.assetCardId ? `/art/cards/${event.assetCardId}.png` : null;
  const isMinionAttack = event.effectKind === "attack" && event.source.kind === "minion" && cardArt !== null;
  const finish = () => {
    if (completeRef.current) return;
    completeRef.current = true;
    onCompleteRef.current(event.id);
  };

  return <>
    <span
      className={`combat-effect-impact effect-${event.effectKind}`}
      style={{ left: geometry.target.x, top: geometry.target.y, animationDelay: `${delay + 360}ms` }}
      aria-hidden="true"
    />
    {cardArt ? <>
      <span
        className={`combat-effect-sprite combat-effect-card-frame${isMinionAttack ? " is-minion-attack" : ""}`}
        data-effect-card={event.assetCardId}
        data-effect-kind={event.effectKind}
        style={style}
        onAnimationEnd={finish}
        aria-hidden="true"
      ><img src={cardArt} alt="" /></span>
      {isMinionAttack && <img
        className="combat-effect-sprite combat-effect-minion-portrait"
        data-effect-card={event.assetCardId}
        data-effect-kind={event.effectKind}
        src={cardArt}
        alt=""
        style={{ ...style, left: geometry.source.x + 34, top: geometry.source.y + 42 }}
        onAnimationEnd={finish}
      />}
    </> : <img
      className="combat-effect-sprite combat-effect-impact-art"
      data-effect-card="impact"
      data-effect-kind={event.effectKind}
      src="/art/effects/impact.png"
      alt=""
      style={style}
      onAnimationEnd={finish}
    />}
  </>;
}

export function CombatEffectLayer({ events, onComplete }: CombatEffectLayerProps) {
  if (typeof document === "undefined" || events.length === 0) return null;
  return createPortal(
    <div className="combat-effect-layer" aria-hidden="true">
      {events.map((event, index) => <EffectSprite key={event.id} event={event} index={index} onComplete={onComplete} />)}
    </div>,
    document.body,
  );
}
