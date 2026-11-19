import type { ReactElement } from "react";
import { useTouchGuidance } from "../game/inputMode.js";

export type TutorialStepId = "inspect-hand" | "play-card" | "end-first-turn" | "attack" | "end-second-turn";
export type TutorialAction = "continue" | "play-card" | "end-turn" | "attack";

export interface FirstRunTutorialProps {
  step: TutorialStepId;
  attackUnavailable?: boolean;
  /** Which instructions to show. Defaults to the device: finger-first screens get tap and drag wording. */
  inputMode?: "touch" | "pointer";
  onAction(action: TutorialAction): void;
  onSkip(): void;
}

const STEP_COPY: Record<TutorialStepId, { title: string; description: string }> = {
  "inspect-hand": { title: "손패와 마나 확인", description: "손패 카드의 비용과 현재 마나를 확인해 보세요. 준비되면 계속을 누르세요." },
  "play-card": { title: "카드 내기", description: "마나가 충분한 카드 한 장을 손패에서 선택해 사용하세요." },
  "end-first-turn": { title: "첫 턴 종료", description: "턴 종료를 눌러 적의 행동을 확인하세요." },
  attack: { title: "하수인 공격", description: "공격 가능한 아군 하수인을 선택한 뒤 적 하수인 또는 적 영웅을 공격하세요." },
  "end-second-turn": { title: "두 번째 턴 종료", description: "행동을 마쳤다면 턴 종료를 눌러 튜토리얼을 마치세요." },
};

// On touch screens a tap opens card details and cards are played by dragging, so the wording differs from the mouse version.
const TOUCH_STEP_COPY: Record<TutorialStepId, { title: string; description: string }> = {
  ...STEP_COPY,
  "inspect-hand": { title: "손패와 마나 확인", description: "손패 카드의 비용과 현재 마나를 확인해 보세요. 카드를 탭하면 자세히 볼 수 있습니다. 준비되면 계속을 누르세요." },
  "play-card": { title: "카드 내기", description: "마나가 충분한 카드를 손패에서 위로 끌어 놓아 사용하세요. 하수인은 빈 칸에, 주문은 대상 위에 놓습니다." },
  attack: { title: "하수인 공격", description: "공격 가능한 아군 하수인을 끌어 적 하수인 또는 적 영웅 위에 놓아 공격하세요." },
};

export function FirstRunTutorial({ step, attackUnavailable = false, inputMode, onAction, onSkip }: FirstRunTutorialProps): ReactElement {
  const deviceUsesTouch = useTouchGuidance();
  const copy = (inputMode ? inputMode === "touch" : deviceUsesTouch) ? TOUCH_STEP_COPY[step] : STEP_COPY[step];
  const stepNumber = ["inspect-hand", "play-card", "end-first-turn", "attack", "end-second-turn"].indexOf(step) + 1;
  return (
    <aside className="first-run-tutorial" role="dialog" aria-labelledby="first-run-tutorial-title" aria-describedby="first-run-tutorial-description">
      <div className="first-run-tutorial-heading"><span className="eyebrow">전투 안내 · {stepNumber} / 5</span><button type="button" className="menu-secondary" onClick={onSkip}>건너뛰기</button></div>
      <h2 id="first-run-tutorial-title">{attackUnavailable ? "공격할 하수인이 없어요" : copy.title}</h2>
      <p id="first-run-tutorial-description">{attackUnavailable ? "적이 공격 가능한 하수인을 모두 처치했습니다. 이번 턴을 종료하고 공격할 하수인을 다시 준비해 보세요." : copy.description}</p>
      {step === "inspect-hand" && <button className="menu-primary" type="button" onClick={() => onAction("continue")}>계속</button>}
    </aside>
  );
}
