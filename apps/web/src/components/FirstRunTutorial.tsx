import type { ReactElement } from "react";
import type { PlayerClass } from "@board-game/game-core";
import { useTouchGuidance } from "../game/inputMode.js";
import { TUTORIAL_STEPS } from "../game/tutorialSteps.js";
import { TutorialSpotlight } from "./TutorialSpotlight.js";

export type TutorialStepId = "turn-order" | "mana" | "hand" | "play-card" | "end-first-turn" | "attack" | "hero-power" | "end-second-turn";
export type TutorialAction = "continue" | "pick-turn-order" | "play-card" | "end-turn" | "attack" | "hero-power";

export interface FirstRunTutorialProps {
  step: TutorialStepId;
  attackUnavailable?: boolean;
  /** True when the hero power cannot be used right now (mana < 2, Demonist without 2 shards, board full). */
  heroPowerUnavailable?: boolean;
  playerClass?: PlayerClass;
  /** Which instructions to show. Defaults to the device: finger-first screens get tap and drag wording. */
  inputMode?: "touch" | "pointer";
  onAction(action: TutorialAction): void;
  onSkip(): void;
}

interface StepCopy { title: string; description: string }

/** What each step points at: the first visible element matching the selector list. */
const STEP_TARGET: Record<TutorialStepId, string> = {
  "turn-order": ".turn-order-cards",
  mana: ".player-controls .mana-display",
  hand: ".hand-panel",
  "play-card": ".hand-panel",
  "end-first-turn": ".end-turn-button",
  attack: ".lane-player",
  "hero-power": ".hero-power-control",
  "end-second-turn": ".end-turn-button",
};

const STEP_COPY: Record<TutorialStepId, StepCopy> = {
  "turn-order": { title: "선후공 카드 고르기", description: "뒷면 카드 한 장을 골라 순서를 정합니다. 매 전투 이렇게 정해지고, 후공은 카드 1장과 동전(이번 턴 마나 +1)을 더 받습니다." },
  mana: { title: "마나", description: "카드를 내려면 마나가 필요합니다. 첫 턴은 1마나이고 매 턴 1씩 늘어 최대 10이 됩니다. 남은 마나는 다음 턴으로 넘어가지 않습니다." },
  hand: { title: "손패와 비용", description: "카드 왼쪽 위 숫자가 비용입니다. 매 턴 시작에 카드를 1장 뽑고, 손패는 10장까지 들 수 있습니다." },
  "play-card": { title: "하수인 내기", description: "밝게 빛나는 카드는 지금 낼 수 있습니다. 하수인 카드를 골라 내 전장에 내세요." },
  "end-first-turn": { title: "턴 종료", description: "할 일을 마치면 턴 종료를 누르세요. 이제 상대가 움직입니다." },
  attack: { title: "하수인 공격", description: "지난 턴에 낸 하수인은 이제 공격할 수 있습니다. 내 하수인을 고른 뒤 적 하수인이나 적 영웅을 누르세요. 낸 턴에는 공격할 수 없고, 도발 하수인이 있으면 그것부터 공격해야 합니다." },
  "hero-power": { title: "영웅 능력", description: "마나 2로 영웅 능력을 씁니다. 한 번 쓰면 내 턴 2번을 쉰 뒤 다시 쓸 수 있으니 아껴 쓰세요." },
  "end-second-turn": { title: "마무리", description: "턴 종료를 누르면 튜토리얼이 끝납니다. 이후 규칙은 메뉴의 게임 방법에서 다시 볼 수 있습니다." },
};

// On touch screens a tap opens card details and cards are played by dragging, so the wording differs from the mouse version.
const TOUCH_STEP_COPY: Record<TutorialStepId, StepCopy> = {
  ...STEP_COPY,
  "turn-order": { title: "선후공 카드 고르기", description: "뒷면 카드 한 장을 탭해 순서를 정합니다. 매 전투 이렇게 정해지고, 후공은 카드 1장과 동전(이번 턴 마나 +1)을 더 받습니다." },
  hand: { title: "손패와 비용", description: "카드 왼쪽 위 숫자가 비용입니다. 매 턴 시작에 카드를 1장 뽑고, 손패는 10장까지 들 수 있습니다. 카드를 탭하면 자세히 볼 수 있습니다." },
  "play-card": { title: "하수인 내기", description: "밝게 빛나는 카드는 지금 낼 수 있습니다. 하수인 카드를 위로 끌어 내 전장의 빈 칸에 놓으세요." },
  attack: { title: "하수인 공격", description: "지난 턴에 낸 하수인은 이제 공격할 수 있습니다. 내 하수인을 끌어 적 하수인이나 적 영웅 위에 놓으세요. 낸 턴에는 공격할 수 없고, 도발 하수인이 있으면 그것부터 공격해야 합니다." },
};

const ATTACK_UNAVAILABLE: StepCopy = { title: "공격할 하수인이 없어요", description: "적이 공격 가능한 하수인을 모두 처치했습니다. 이번 턴을 종료하고 공격할 하수인을 다시 준비해 보세요." };
const HERO_POWER_UNAVAILABLE: StepCopy = { title: "영웅 능력은 다음에", description: "영웅 능력은 마나 2가 있어야 쓸 수 있고, 악마술사는 영혼 조각 2개도 필요합니다. 지금은 조건이 안 되니 계속을 눌러 넘어가세요. 한 번 쓰면 내 턴 2번을 쉰 뒤 다시 쓸 수 있습니다." };

function heroPowerCopy(base: StepCopy, playerClass: PlayerClass | undefined, touch: boolean): StepCopy {
  if (playerClass !== "assassin") return base;
  return { ...base, description: `${base.description} 그림자 습격은 적 하수인이나 적 영웅을 골라 씁니다.${touch ? " 버튼을 적 위로 끌어 놓아도 됩니다." : ""}` };
}

export function FirstRunTutorial({ step, attackUnavailable = false, heroPowerUnavailable = false, playerClass, inputMode, onAction, onSkip }: FirstRunTutorialProps): ReactElement {
  const deviceUsesTouch = useTouchGuidance();
  const touch = inputMode ? inputMode === "touch" : deviceUsesTouch;
  const base = (touch ? TOUCH_STEP_COPY : STEP_COPY)[step];
  const copy = step === "attack" && attackUnavailable
    ? ATTACK_UNAVAILABLE
    : step === "hero-power"
      ? (heroPowerUnavailable ? HERO_POWER_UNAVAILABLE : heroPowerCopy(base, playerClass, touch))
      : base;
  const showContinue = step === "mana" || step === "hand" || (step === "hero-power" && heroPowerUnavailable);
  const stepLabel = `${TUTORIAL_STEPS.indexOf(step) + 1} / ${TUTORIAL_STEPS.length}`;
  return (
    <TutorialSpotlight
      target={STEP_TARGET[step]}
      title={copy.title}
      description={copy.description}
      stepLabel={stepLabel}
      onSkip={onSkip}
      {...(showContinue ? { onContinue: () => onAction("continue") } : {})}
    />
  );
}
