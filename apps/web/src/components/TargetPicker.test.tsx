import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DiscardPicker } from "./DiscardPicker.js";
import { RewardScreen } from "./RewardScreen.js";
import { TargetPicker } from "./TargetPicker.js";

describe("interaction prompts", () => {
  it("explains target selection and provides a keyboard-accessible cancel button", () => {
    const markup = renderToStaticMarkup(<TargetPicker mode="spell" onCancel={vi.fn()} />);
    expect(markup).toContain("주문 대상을 선택하세요");
    expect(markup).toContain("type=\"button\"");
    expect(markup).toContain("취소");
  });

  it("shows a dialog with one discard option per existing hand card", () => {
    const cards = Array.from({ length: 10 }, (_, index) => ({ instanceId: `card-${index}`, cardId: "ash-wolf" }));
    const markup = renderToStaticMarkup(<DiscardPicker cards={cards} disabled={false} onDiscard={vi.fn()} />);
    expect(markup).toContain("role=\"dialog\"");
    expect(markup.match(/class="card-cost/g)).toHaveLength(10);
    expect(markup).toContain("새 카드를 뽑기 전에 한 장을 버리세요");
  });

  it("renders every offered reward and a skip action", () => {
    const markup = renderToStaticMarkup(<RewardScreen reward={{ tier: "normal", choices: ["ash-wolf", "shadow-bolt", "crypt-guard"], encounterIndex: 0 }} onChoose={vi.fn()} onSkip={vi.fn()} />);
    expect(markup.match(/class="reward-card/g)).toHaveLength(3);
    expect(markup).toContain("보상 건너뛰기");
  });
});
