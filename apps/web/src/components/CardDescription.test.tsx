// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CardDescription } from "./CardDescription.js";

describe("CardDescription", () => {
  it("shows a leading taunt keyword as a tag and keeps the sentence intact", () => {
    const { container } = render(<p><CardDescription text="도발. 전투의 함성: 하급 임프 1마리를 소환합니다." /></p>);
    expect(container.querySelector(".taunt-tag")?.textContent).toBe("도발");
    expect(container.textContent).toBe("도발. 전투의 함성: 하급 임프 1마리를 소환합니다.");
    const bare = render(<p><CardDescription text="도발" /></p>);
    expect(bare.container.textContent).toBe("도발");
  });

  it("leaves other descriptions untouched", () => {
    const { container } = render(<p><CardDescription text="특수 효과 없음" /></p>);
    expect(container.querySelector(".taunt-tag")).toBeNull();
    expect(container.textContent).toBe("특수 효과 없음");
  });
});
