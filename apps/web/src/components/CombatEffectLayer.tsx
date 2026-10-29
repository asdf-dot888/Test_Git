import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { gameConstants } from "@board-game/game-core";
import { CARD_COMBAT_VISUAL_PROFILES, type CombatAnchor, type CombatEffectEvent } from "../game/combatEffects.js";

interface CombatEffectLayerProps {
  events: CombatEffectEvent[];
  paused?: boolean;
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

const boardShakeOwners = new WeakMap<HTMLElement, Map<string, Set<number>>>();

function retainBoardShake(board: HTMLElement, className: string, eventId: number): void {
  let ownersByClass = boardShakeOwners.get(board);
  if (!ownersByClass) {
    ownersByClass = new Map();
    boardShakeOwners.set(board, ownersByClass);
  }
  let owners = ownersByClass.get(className);
  if (!owners) {
    owners = new Set();
    ownersByClass.set(className, owners);
  }
  owners.add(eventId);
  board.classList.add(className);
}

function releaseBoardShake(board: HTMLElement, className: string, eventId: number): void {
  const ownersByClass = boardShakeOwners.get(board);
  const owners = ownersByClass?.get(className);
  owners?.delete(eventId);
  if (owners?.size === 0) {
    board.classList.remove(className);
    ownersByClass?.delete(className);
  }
}

function anchorName(anchor: CombatAnchor): string {
  if (anchor.kind === "hero") return `hero:${anchor.side}`;
  if (anchor.kind === "minion") return `minion:${anchor.side}:${anchor.slot}`;
  return `hand:${anchor.side}:${anchor.slot}`;
}

function centerOf(element: HTMLElement): Point {
  const bounds = element.getBoundingClientRect();
  return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
}

function fallbackPoint(anchor: CombatAnchor): Point {
  const board = document.querySelector<HTMLElement>(".battle-board");
  const bounds = board?.getBoundingClientRect();
  if (anchor.kind === "hand") {
    const hand = document.querySelector<HTMLElement>(anchor.side === "enemy" ? ".enemy-hand" : ".hand-panel");
    return hand ? centerOf(hand) : { x: window.innerWidth / 2, y: window.innerHeight - 72 };
  }
  if (!bounds) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const y = anchor.kind === "hero"
    ? (anchor.side === "enemy" ? bounds.top + bounds.height * 0.2 : bounds.top + bounds.height * 0.8)
    : (anchor.side === "enemy" ? bounds.top + bounds.height * 0.32 : bounds.top + bounds.height * 0.68);
  const x = anchor.kind === "hero"
    ? bounds.left + bounds.width / 2
    : bounds.left + bounds.width * ((anchor.slot + 0.5) / gameConstants.maxBoard);
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

function EffectSprite({ event, index, paused, onComplete }: { event: CombatEffectEvent; index: number; paused: boolean; onComplete(id: number): void }) {
  const profile = event.assetCardId ? CARD_COMBAT_VISUAL_PROFILES[event.assetCardId] : undefined;
  const [geometry, setGeometry] = useState<EffectGeometry | null>(null);
  const completeRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const remainingMs = useRef<number | null>(null);
  const deadline = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const shakeRemainingMs = useRef<number | null>(null);
  const shakeDeadline = useRef<number | null>(null);
  const shakeTimeout = useRef<number | null>(null);

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
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [event, index]);

  useEffect(() => {
    if (completeRef.current) return;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const motionScale = event.slowMotion ? 2 : 1;
    if (remainingMs.current === null) remainingMs.current = ((reducedMotion ? 220 : Math.max(1_400, 1_010 + (profile?.durationMs ?? 390))) + Math.min(index, 8) * 120) * motionScale;
    if (paused) {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      if (deadline.current !== null) {
        remainingMs.current = Math.max(0, deadline.current - Date.now());
        deadline.current = null;
      }
      return;
    }
    deadline.current = Date.now() + remainingMs.current;
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      deadline.current = null;
      remainingMs.current = 0;
      if (completeRef.current) return;
      completeRef.current = true;
      onCompleteRef.current(event.id);
    }, remainingMs.current);
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      if (deadline.current !== null) {
        remainingMs.current = Math.max(0, deadline.current - Date.now());
        deadline.current = null;
      }
    };
  }, [event.id, event.slowMotion, index, paused, profile?.durationMs]);

  const shakeClass = event.areaImpact ? "is-shaking" : event.damageTarget ? "is-hit-shaking" : null;

  useEffect(() => {
    if (!shakeClass || (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false)) return;
    const board = document.querySelector<HTMLElement>(".battle-board");
    if (!board) return;
    retainBoardShake(board, shakeClass, event.id);
    return () => {
      releaseBoardShake(board, shakeClass, event.id);
      if (!board.classList.contains("is-shaking") && !board.classList.contains("is-hit-shaking")) {
        board.style.animationPlayState = "";
      }
    };
  }, [event.areaImpact, event.damageTarget, event.id, shakeClass]);

  useEffect(() => {
    if (!shakeClass || (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false)) return;
    const board = document.querySelector<HTMLElement>(".battle-board");
    if (!board) return;
    if (shakeRemainingMs.current === null) shakeRemainingMs.current = (event.areaImpact ? 500 : 1_430) + Math.min(index, 8) * 120;
    board.style.animationPlayState = paused ? "paused" : "running";
    if (paused) {
      if (shakeTimeout.current !== null) window.clearTimeout(shakeTimeout.current);
      shakeTimeout.current = null;
      if (shakeDeadline.current !== null) {
        shakeRemainingMs.current = Math.max(0, shakeDeadline.current - Date.now());
        shakeDeadline.current = null;
      }
      return;
    }
    shakeDeadline.current = Date.now() + shakeRemainingMs.current;
    shakeTimeout.current = window.setTimeout(() => {
      shakeTimeout.current = null;
      shakeDeadline.current = null;
      shakeRemainingMs.current = 0;
      releaseBoardShake(board, shakeClass, event.id);
      if (!board.classList.contains("is-shaking") && !board.classList.contains("is-hit-shaking")) {
        board.style.animationPlayState = "";
      }
    }, shakeRemainingMs.current);
    return () => {
      if (shakeTimeout.current !== null) window.clearTimeout(shakeTimeout.current);
      shakeTimeout.current = null;
      if (shakeDeadline.current !== null) {
        shakeRemainingMs.current = Math.max(0, shakeDeadline.current - Date.now());
        shakeDeadline.current = null;
      }
    };
  }, [event.areaImpact, event.damageTarget, event.id, index, paused, shakeClass]);

  useEffect(() => {
    if (!event.bossArea) return;
    const board = document.querySelector<HTMLElement>(".battle-board");
    if (!board) return;
    board.classList.add("is-boss-area-warning");
    board.style.setProperty("--boss-warning-play-state", paused ? "paused" : "running");
    return () => {
      board.classList.remove("is-boss-area-warning");
      board.style.removeProperty("--boss-warning-play-state");
    };
  }, [event.bossArea, event.id, paused]);

  if (!geometry) return null;
  const motionScale = event.slowMotion ? 2 : 1;
  const delay = Math.min(index, 8) * 120;
  const style = {
    left: geometry.source.x,
    top: geometry.source.y,
    "--effect-dx": `${geometry.target.x - geometry.source.x}px`,
    "--effect-dy": `${geometry.target.y - geometry.source.y}px`,
    animationDelay: `${delay * motionScale}ms`,
    animationPlayState: paused ? "paused" as const : "running" as const,
  } as CSSProperties;
  const boardBounds = event.areaImpact ? document.querySelector<HTMLElement>(".battle-board")?.getBoundingClientRect() : undefined;
  const areaWidth = Math.min(window.innerWidth * 0.64, 520);
  const areaHeight = Math.min(window.innerHeight * 0.35, 220);
  const impactStyle = event.areaImpact && boardBounds
    ? { left: boardBounds.left + (boardBounds.width - areaWidth) / 2, top: boardBounds.top + (boardBounds.height - areaHeight) / 2, animationDelay: `${(delay + 930) * motionScale}ms` }
    : { left: geometry.target.x, top: geometry.target.y, animationDelay: `${(delay + 930) * motionScale}ms` };
  const isCardSource = event.source.kind === "hand" || event.source.kind === "minion";
  const cardArt = isCardSource && event.assetCardId ? `/art/cards/${event.assetCardId}.png` : null;
  const isMinionAttack = event.effectKind === "attack" && event.source.kind === "minion" && cardArt !== null;
  const profileStyle = {
    "--card-accent": profile?.accent ?? "#f4c66e",
    "--profile-duration": `${profile?.durationMs ?? 930}ms`,
  } as CSSProperties;
  const visualClass = profile ? ` motion-${profile.motionClass} profile-${event.assetCardId}` : "";
  const slowClass = event.slowMotion ? " is-slow-motion" : "";
  const hitClass = event.damageTarget === "minion" ? " is-minion-hit" : event.damageTarget === "hero" ? " is-hero-hit" : "";
  const targetStyle = {
    left: geometry.target.x,
    top: geometry.target.y,
    animationDelay: `${(delay + 930) * motionScale}ms`,
    animationPlayState: paused ? "paused" as const : "running" as const,
    "--effect-dx": `${geometry.target.x - geometry.source.x}px`,
    "--effect-dy": `${geometry.target.y - geometry.source.y}px`,
  } as CSSProperties;
  const finish = () => {
    if (completeRef.current) return;
    completeRef.current = true;
    onCompleteRef.current(event.id);
  };

  return <>
    <span
      className={`combat-effect-impact effect-${event.effectKind}${event.areaImpact ? " is-area-impact" : ""}${event.bossArea ? " is-boss-area" : ""}${hitClass}${visualClass}${slowClass}`}
      style={{ ...profileStyle, ...impactStyle, animationPlayState: paused ? "paused" : "running" }}
      onAnimationEnd={finish}
      aria-hidden="true"
    />
    {cardArt && !isMinionAttack ? <>
      <span
        className={`combat-effect-sprite combat-effect-card-frame effect-${event.effectKind}${visualClass}${slowClass}`}
        data-effect-card={event.assetCardId}
        data-effect-kind={event.effectKind}
        style={{ ...profileStyle, ...style }}
        aria-hidden="true"
      ><img src={cardArt} alt="" />{profile && <span className="combat-effect-particles" data-particles={profile.particles} />}</span>
    </> : isMinionAttack && cardArt ? <>
      <img
        className={`combat-effect-sprite combat-effect-minion-portrait${slowClass}`}
        data-effect-card={event.assetCardId}
        data-effect-kind={event.effectKind}
        data-particles={profile?.particles ?? "bone"}
        src={cardArt}
        alt=""
        style={{ ...profileStyle, ...style }}
      />
      <span
        className={`combat-effect-sprite combat-effect-weapon-trail${slowClass}`}
        data-particles={profile?.particles ?? "bone"}
        style={{ ...profileStyle, ...style, "--effect-angle": `${Math.atan2(geometry.target.y - geometry.source.y, geometry.target.x - geometry.source.x) * 180 / Math.PI}deg` } as CSSProperties}
        aria-hidden="true"
      />
    </> : <img
      className={`combat-effect-sprite combat-effect-impact-art${slowClass}`}
      data-effect-card="impact"
      data-effect-kind={event.effectKind}
      src="/art/effects/impact.png"
      alt=""
      style={{ ...profileStyle, ...style }}
    />}
    {event.damageTarget === "minion" && <span
      className="combat-effect-blood-splatter"
      style={{ ...targetStyle, "--card-accent": profile?.accent ?? "#d31d2c" } as CSSProperties}
      aria-hidden="true"
    />}
    {event.damageTarget === "hero" && <span
      className={`combat-effect-hero-hit-flash${slowClass}`}
      style={{ animationDelay: `${(delay + 930) * motionScale}ms`, animationPlayState: paused ? "paused" : "running" }}
      aria-hidden="true"
    />}
    {event.deathAnchors?.map((anchor, deathIndex) => {
      const point = anchorPoint(anchor, event, false);
      return <span
        key={`${event.id}-death-${deathIndex}`}
        className={`combat-effect-death${slowClass}`}
        style={{ left: point.x, top: point.y, animationDelay: `${delay * motionScale}ms`, animationPlayState: paused ? "paused" : "running" }}
        aria-hidden="true"
      ><i /><i /><i /><i /><b /></span>;
    })}
  </>;
}

export function CombatEffectLayer({ events, paused = false, onComplete }: CombatEffectLayerProps) {
  if (typeof document === "undefined" || events.length === 0) return null;
  return createPortal(
    <div className={`combat-effect-layer${paused ? " is-paused" : ""}`} aria-hidden="true">
      {events.map((event, index) => <EffectSprite key={event.id} event={event} index={index} paused={paused} onComplete={onComplete} />)}
    </div>,
    document.body,
  );
}
