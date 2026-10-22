import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EnemyHand } from "./EnemyHand.js";

describe("EnemyHand", () => {
  it("shows facedown cards and an accessible count without rendering card faces", () => {
    const markup = renderToStaticMarkup(<EnemyHand count={3} instanceIds={["enemy-1", "enemy-2", "enemy-3"]} />);
    expect(markup).toContain("aria-label=\"적 손패 3장\"");
    expect(markup.match(/class=\"enemy-card-back\"/g)).toHaveLength(3);
    expect(markup).not.toContain("카드 이름");
  });

  it("caps visible backs while reporting overflow", () => {
    const markup = renderToStaticMarkup(<EnemyHand count={12} maxVisible={5} />);
    expect(markup.match(/class=\"enemy-card-back\"/g)).toHaveLength(5);
    expect(markup).toContain("+7");
    expect(markup).toContain("적 손패 12장");
  });
});
