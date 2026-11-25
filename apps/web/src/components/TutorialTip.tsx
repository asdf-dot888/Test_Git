import { useEffect, type ReactElement } from "react";
import type { TutorialTipId } from "../game/tutorialProgress.js";

const TIP_COPY: Record<TutorialTipId, { title: string; description: string }> = {
  taunt: { title: "도발", description: "방패 표시가 있는 하수인이 도발입니다. 상대 전장에 도발이 있으면 그 하수인부터 공격해야 합니다." },
  fatigue: { title: "탈진", description: "덱이 비어 카드를 못 뽑으면 영웅이 피해를 받습니다. 뽑을 때마다 1, 2, 3…씩 커집니다." },
};

const AUTO_HIDE_MS = 9_000;

/** A one-time rule tip at the bottom of the screen. It never blocks play and hides itself after a few seconds. */
export function TutorialTip({ tip, onClose }: { tip: TutorialTipId; onClose(): void }): ReactElement {
  useEffect(() => {
    const timeout = window.setTimeout(onClose, AUTO_HIDE_MS);
    return () => window.clearTimeout(timeout);
  }, [tip, onClose]);
  const copy = TIP_COPY[tip];
  return (
    <aside className="tutorial-tip" role="status" aria-label={`${copy.title} 안내`}>
      <strong>{copy.title}</strong>
      <p>{copy.description}</p>
      <button type="button" onClick={onClose}>닫기</button>
    </aside>
  );
}
