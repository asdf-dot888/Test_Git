import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MinionLane } from "./MinionLane.js";

describe("MinionLane", () => {
  it("labels the enemy lane while retaining all five slots", () => {
    const markup = renderToStaticMarkup(
      <MinionLane
        side="enemy"
        minions={[]}
        selectedAttackerId={null}
        targetMode="none"
        targetSide={null}
        disabled={false}
        turnNumber={1}
        onSelectTarget={vi.fn()}
      />,
    );

    expect(markup).toContain('class="minion-lane lane-enemy"');
    expect(markup).toContain('aria-label="적 하수인 전장"');
    expect(markup.match(/class="lane-slot/g)).toHaveLength(5);
  });
});
