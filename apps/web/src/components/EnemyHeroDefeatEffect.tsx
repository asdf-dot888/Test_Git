import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface EnemyHeroDefeatEffectProps {
  onComplete(): void;
}

export function EnemyHeroDefeatEffect({ onComplete }: EnemyHeroDefeatEffectProps) {
  const [bounds, setBounds] = useState<DOMRect | null>(null);
  const completed = useRef(false);
  const callback = useRef(onComplete);
  callback.current = onComplete;

  useEffect(() => {
    const portrait = document.querySelector<HTMLElement>('[data-effect-anchor="hero:enemy"]');
    if (portrait) setBounds(portrait.getBoundingClientRect());
    const board = document.querySelector<HTMLElement>(".battle-board");
    board?.classList.add("is-enemy-defeat");
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const timer = window.setTimeout(() => {
      if (completed.current) return;
      completed.current = true;
      callback.current();
    }, reducedMotion ? 100 : 2_200);
    return () => {
      window.clearTimeout(timer);
      board?.classList.remove("is-enemy-defeat");
    };
  }, []);

  if (typeof document === "undefined" || !bounds) return null;
  const finish = () => {
    if (completed.current) return;
    completed.current = true;
    callback.current();
  };

  return createPortal(
    <div className="enemy-hero-defeat-layer" aria-hidden="true">
      <div className="enemy-hero-defeat" style={{ left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height }} onAnimationEnd={(event) => { if (event.target === event.currentTarget) finish(); }}>
        <span className="enemy-defeat-cracks"><i /><i /><i /><i /></span>
        <span className="enemy-defeat-flame" />
        <span className="enemy-defeat-ash">{Array.from({ length: 9 }, (_, index) => <i key={index} />)}</span>
      </div>
    </div>,
    document.body,
  );
}
