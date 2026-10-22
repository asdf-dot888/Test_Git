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
        isResolving={false}
        error={null}
        onSelectCard={vi.fn()}
        onSelectTarget={vi.fn()}
        onDiscardCard={vi.fn()}
        onCancelTarget={vi.fn()}
        onEndTurn={vi.fn()}
        onMenu={vi.fn()}
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

  it("shows a quiet warning only while a hidden enemy charge is pending", () => {
    const renderBoard = (run: ReturnType<typeof createRun>) => renderToStaticMarkup(
      <GameBoard
        run={run}
        selectedCardInstanceId={null}
        selectedAttackerId={null}
        targetMode="none"
        isResolving={false}
        error={null}
        onSelectCard={vi.fn()}
        onSelectTarget={vi.fn()}
        onDiscardCard={vi.fn()}
        onCancelTarget={vi.fn()}
        onEndTurn={vi.fn()}
        onMenu={vi.fn()}
      />,
    );
    const plain = createRun(413);
    expect(renderBoard(plain)).not.toContain("enemy-charge-warning");

    const legacy = structuredClone(plain);
    delete legacy.battle!.pendingEnemyCharge;
    expect(renderBoard(legacy)).not.toContain("enemy-charge-warning");

    const charging = structuredClone(plain);
    charging.battle!.pendingEnemyCharge = { turnsRemaining: 998, damage: 137, target: "board-and-hero" };
    const markup = renderBoard(charging);
    expect(markup).toContain("class=\"battle-board enemy-charge-warning\"");
    expect(markup).toContain("class=\"hero-portrait-wrap is-charge-warning\"");
    expect(markup).toContain("적 영웅");
    expect(markup).not.toContain("137");
    expect(markup).not.toContain("998");
    expect(markup).not.toContain("board-and-hero");
  });
});
