import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { findSpotlightTarget } from "../game/spotlightTarget.js";

export interface TutorialSpotlightProps {
  /** CSS selector list; the first matching element with a non-zero box is highlighted. null = no hole, callout centred. */
  target: string | null;
  title: string;
  description: string;
  /** "n / total" shown in the callout header. */
  stepLabel: string;
  /** Shows a "계속" button (with this label) that calls onContinue. */
  continueLabel?: string;
  onContinue?(): void;
  onSkip(): void;
  /** Extra px around the target box. Default 8. */
  padding?: number;
}

interface Box { top: number; left: number; width: number; height: number }

const EDGE = 12;
const CALLOUT_WIDTH = 340;
const SPACE_BELOW_NEEDED = 180;
const REMEASURE_MS = 250;

function measure(selector: string | null, padding: number): Box | null {
  if (!selector) return null;
  const element = findSpotlightTarget(selector);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return { top: rect.top - padding, left: rect.left - padding, width: rect.width + padding * 2, height: rect.height + padding * 2 };
}

function sameBox(a: Box | null, b: Box | null): boolean {
  if (!a || !b) return a === b;
  return Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;
}

/**
 * Dims the whole screen except one element and points a callout at it. The overlay never takes clicks or drags
 * (pointer-events: none); only the callout itself is interactive, so the game underneath keeps working as usual.
 */
export function TutorialSpotlight({ target, title, description, stepLabel, continueLabel, onContinue, onSkip, padding = 8 }: TutorialSpotlightProps): ReactElement {
  const titleId = useId();
  const descriptionId = useId();
  const [box, setBox] = useState<Box | null>(() => measure(target, padding));
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const continueRef = useRef<HTMLButtonElement>(null);
  const calloutRef = useRef<HTMLElement>(null);
  const [calloutHeight, setCalloutHeight] = useState(SPACE_BELOW_NEEDED);

  useLayoutEffect(() => {
    let frame = 0;
    let last = 0;
    const update = () => {
      const next = measure(target, padding);
      setBox((current) => (sameBox(current, next) ? current : next));
      setViewport((current) => (current.width === window.innerWidth && current.height === window.innerHeight ? current : { width: window.innerWidth, height: window.innerHeight }));
      const height = calloutRef.current?.offsetHeight;
      if (height) setCalloutHeight((current) => (Math.abs(current - height) < 1 ? current : height));
    };
    // Cards animate in and the hand grows, so the target is re-measured a few times a second while the step is shown.
    const tick = (time: number) => {
      if (time - last >= REMEASURE_MS) {
        last = time;
        update();
      }
      frame = window.requestAnimationFrame(tick);
    };
    update();
    frame = window.requestAnimationFrame(tick);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const element = target ? findSpotlightTarget(target) : null;
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    if (observer) {
      observer.observe(document.body);
      if (element) observer.observe(element);
    }
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      observer?.disconnect();
    };
  }, [target, padding]);

  useEffect(() => {
    if (onContinue) continueRef.current?.focus();
  }, [onContinue, stepLabel]);

  const calloutWidth = Math.min(CALLOUT_WIDTH, viewport.width - EDGE * 2);
  let calloutStyle: CSSProperties;
  let arrow: "up" | "down" | null = null;
  let arrowLeft = calloutWidth / 2;
  if (box) {
    const centre = box.left + box.width / 2;
    const left = Math.min(Math.max(centre - calloutWidth / 2, EDGE), viewport.width - calloutWidth - EDGE);
    arrowLeft = Math.min(Math.max(centre - left, 18), calloutWidth - 18);
    const spaceBelow = viewport.height - (box.top + box.height);
    // The callout goes below the target when it fits there, otherwise above, otherwise in the middle of the screen.
    const needed = calloutHeight + 14 + EDGE;
    if (spaceBelow >= needed) {
      calloutStyle = { top: box.top + box.height + 14, left, width: calloutWidth };
      arrow = "up";
    } else if (box.top >= needed) {
      calloutStyle = { bottom: viewport.height - box.top + 14, left, width: calloutWidth };
      arrow = "down";
    } else {
      calloutStyle = { top: "50%", left: "50%", width: calloutWidth, transform: "translate(-50%, -50%)" };
    }
  } else {
    calloutStyle = { top: "50%", left: "50%", width: calloutWidth, transform: "translate(-50%, -50%)" };
  }

  return createPortal(
    <div className="tutorial-spotlight" data-testid="tutorial-spotlight">
      {box
        ? <div className="tutorial-spotlight-hole" data-testid="tutorial-spotlight-hole" style={{ top: box.top, left: box.left, width: box.width, height: box.height }} />
        : <div className="tutorial-spotlight-dim" />}
      <aside ref={calloutRef} className="tutorial-spotlight-callout" role="dialog" aria-modal="false" aria-labelledby={titleId} aria-describedby={descriptionId} style={calloutStyle}>
        {arrow && <span className={`tutorial-spotlight-arrow is-${arrow}`} aria-hidden="true" style={{ left: arrowLeft }} />}
        <div className="tutorial-spotlight-heading">
          <span className="tutorial-spotlight-step">{stepLabel}</span>
          <button type="button" className="menu-secondary" onClick={onSkip}>건너뛰기</button>
        </div>
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId}>{description}</p>
        {onContinue && <button ref={continueRef} type="button" className="menu-primary" onClick={onContinue}>{continueLabel ?? "계속"}</button>}
      </aside>
    </div>,
    document.body,
  );
}
