import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createRun } from "@board-game/game-core";
import { GameBoard } from "./GameBoard.js";

describe("GameBoard", () => {
  it("renders both heroes, two five-slot lanes, mana, hand, and turn control", () => {
    const markup = renderToStaticMarkup(
      <GameBoard
        run={createRun(412)}
        selectedCardInstanceId={null}
        selectedAttackerId={null}
        targetMode="none"
        onSelectCard={vi.fn()}
        onSelectTarget={vi.fn()}
        onEndTurn={vi.fn()}
      />,
    );

    expect(markup).toContain("class=\"hero-panel hero-enemy\"");
    expect(markup).toContain("aria-label=\"잿빛 방랑자 영웅\"");
    expect(markup.match(/class="lane-slot/g)).toHaveLength(10);
    expect(markup).toContain("마나");
    expect(markup).toContain("손패");
    expect(markup).toContain("턴 종료");
    expect(markup).toContain("공격");
    expect(markup).toContain("체력");
  });
});
