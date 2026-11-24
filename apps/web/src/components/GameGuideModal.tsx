import type { ReactElement } from "react";
import { createPortal } from "react-dom";
import { useTouchGuidance } from "../game/inputMode.js";

interface GameGuideModalProps {
  open: boolean;
  onClose(): void;
  onReplayTutorial?(): void;
  /** Which controls to describe. Defaults to the device: finger-first screens get tap and drag wording. */
  inputMode?: "touch" | "pointer";
}

export function GameGuideModal({ open, onClose, onReplayTutorial, inputMode }: GameGuideModalProps): ReactElement | null {
  const deviceUsesTouch = useTouchGuidance();
  const touch = inputMode ? inputMode === "touch" : deviceUsesTouch;
  if (!open) return null;

  return createPortal(
    <div className="game-guide-backdrop">
      <section className="game-guide-panel" role="dialog" aria-modal="true" aria-labelledby="game-guide-title">
        <header className="game-guide-header">
          <span className="eyebrow">MANGO STONE</span>
          <button className="menu-secondary" type="button" onClick={onClose}>닫기</button>
        </header>
        <h2 id="game-guide-title">게임 방법</h2>
        <div className="game-guide-content">
          <section>
            <h3>원정 진행</h3>
            <p>원정은 총 3페이즈로 진행됩니다. 각 페이즈에서 일반 전투 3회 후 보스 전투 1회를 치릅니다. 보스는 카드 행동 뒤 일반 난이도에서는 3턴마다, 하드에서는 2턴마다 내 하수인과 영웅 모두에게 피해 1을 줍니다.</p>
          </section>
          <section>
            <h3>마나와 카드</h3>
            <p>전투는 마나 1/1로 시작하고, 자기 턴이 지날 때마다 최대 마나가 1씩 늘어 10까지 늘어납니다(적도 같습니다). 마나는 매 턴 시작에 가득 차며 쓰지 않은 마나는 다음 턴으로 이어지지 않습니다. 자기 턴이 시작될 때마다 카드를 1장 뽑고, 손패는 10장까지이며 넘치는 카드는 버려집니다.</p>
            <p>뽑을 카드가 없으면 덱을 다시 섞지 않고 영웅이 피해를 받습니다(탈진). 첫 번째는 1, 다음은 2, 3... 하나씩 늘어납니다. 적도 같은 규칙입니다.</p>
            <p><strong>마력의 샘</strong>은 비용 0으로 이번 턴에만 쓸 수 있는 마나를 1 얻습니다(합쳐서 10을 넘지 않습니다).</p>
          </section>
          <section>
            <h3>선공과 후공</h3>
            <p>전투가 시작될 때마다 뒷면 카드 두 장 중 한 장을 고릅니다. 하나는 선공, 하나는 후공입니다. 선공은 시작 손패 3장으로 시작하고 1턴에도 카드를 1장 뽑습니다. 후공은 시작 손패 4장과 <strong>동전</strong>(비용 0, 이번 턴에만 마나 +1, 쓰면 사라짐)으로 시작하고, 상대가 먼저 움직입니다.</p>
          </section>
          <section>
            <h3>하수인과 주문</h3>
            <p>하수인은 낸 다음 턴부터 턴마다 한 번 공격할 수 있습니다. 하수인끼리 공격하면 양쪽 모두 상대 하수인의 공격력만큼 피해를 받습니다. 상대 하수인이 있어도 영웅을 바로 공격할 수 있습니다.</p>
            <p><strong>도발</strong> 하수인이 상대 전장에 있으면 상대 영웅과 다른 하수인은 공격할 수 없고, 도발 하수인만 공격할 수 있습니다. 주문과 영웅 능력은 도발과 상관없이 대상을 고를 수 있습니다.</p>
            <p>주문은 카드에 적힌 효과를 즉시 발휘합니다.</p>
          </section>
          <section>
            <h3>조작 방법</h3>
            {touch
              ? <p>카드나 하수인을 탭하면 자세한 정보를 볼 수 있고, 빈 곳이나 닫기 버튼을 누르면 닫힙니다. 카드는 위로 끌어 놓아 사용하고, 하수인은 적 하수인이나 적 영웅 위로 끌어 공격합니다. 영웅 능력은 버튼을 눌러 사용합니다. 암살자는 버튼을 누른 뒤 적을 탭하거나, 버튼을 적 위로 끌어 놓아 사용합니다.</p>
              : <p>카드를 클릭해 선택하거나 끌어 놓아 사용하고, 하수인을 선택하거나 끌어서 적 하수인이나 적 영웅을 공격합니다. 도발 하수인은 방패 표시가 있고, 도발 때문에 공격할 수 없는 대상은 흐리게 보입니다. 카드에 마우스를 올리면 자세한 정보가 보입니다.</p>}
          </section>
          <section>
            <h3>승리와 보상</h3>
            <p>전투에서 이기면 승리를 확인하고 카드 보상을 선택하거나 건너뜁니다. 보상 확인 후 다음 전투를 시작할 수 있습니다.</p>
          </section>
        </div>
        {onReplayTutorial && <button className="menu-primary game-guide-replay" type="button" onClick={() => { onClose(); onReplayTutorial(); }}>전투 튜토리얼 다시 보기</button>}
      </section>
    </div>,
    document.body,
  );
}
