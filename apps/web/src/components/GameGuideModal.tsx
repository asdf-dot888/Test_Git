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
            <p>원정은 총 3페이즈로 진행됩니다. 각 페이즈에서 일반 전투 3회 후 보스 전투 1회를 치릅니다.</p>
          </section>
          <section>
            <h3>마나와 카드</h3>
            <p>전투는 마나 5/10으로 시작합니다. 카드를 낼 때 마나를 사용하며, 사용하지 않은 마나는 다음 턴으로 이어집니다. 플레이어 마나는 2~3턴에 1, 4~6턴에 2, 7턴부터 3씩 회복하고 최대 10입니다.</p>
            <p><strong>마력의 샘</strong>은 비용 0으로 현재 마나를 1 얻습니다. 최대 마나를 넘지는 않습니다.</p>
          </section>
          <section>
            <h3>하수인과 주문</h3>
            <p>하수인은 낸 다음 턴부터 턴마다 한 번 공격할 수 있습니다. 하수인끼리 공격하면 양쪽 모두 상대 하수인의 공격력만큼 피해를 받습니다.</p>
            <p>주문은 카드에 적힌 효과를 즉시 발휘합니다.</p>
          </section>
          <section>
            <h3>조작 방법</h3>
            {touch
              ? <p>카드나 하수인을 탭하면 자세한 정보를 볼 수 있고, 빈 곳이나 닫기 버튼을 누르면 닫힙니다. 카드는 위로 끌어 놓아 사용하고, 하수인은 적 위로 끌어 공격합니다. 영웅 능력은 버튼을 눌러 사용합니다. 암살자는 버튼을 누른 뒤 적을 탭하거나, 버튼을 적 위로 끌어 놓아 사용합니다.</p>
              : <p>카드를 클릭해 선택하거나 끌어 놓아 사용하고, 하수인을 선택하거나 끌어서 공격합니다. 카드에 마우스를 올리면 자세한 정보가 보입니다.</p>}
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
