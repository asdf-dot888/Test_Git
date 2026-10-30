// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GameGuideModal } from "./GameGuideModal.js";

describe("GameGuideModal", () => {
  it("stays hidden while closed", () => {
    render(<GameGuideModal open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows core expedition rules in an accessible dialog and closes on click", () => {
    const onClose = vi.fn();
    render(<GameGuideModal open={true} onClose={onClose} />);

    const dialog = screen.getByRole("dialog", { name: "게임 방법" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(screen.getByText("MANGO STONE")).toBeTruthy();
    expect(dialog.textContent).toContain("일반 전투 3회 후 보스 전투 1회");
    expect(dialog.textContent).toContain("전투는 마나 5/10으로 시작합니다");
    expect(dialog.textContent).toContain("2~3턴에 1, 4~6턴에 2, 7턴부터 3씩");
    expect(dialog.textContent).toContain("양쪽 모두 상대 하수인의 공격력만큼 피해");
    expect(dialog.textContent).toContain("마력의 샘");
    expect(dialog.textContent).toContain("카드 보상을 선택하거나 건너뜁니다");
    expect(dialog.textContent).not.toContain("20초");

    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("offers a tutorial replay action when the menu supplies one", () => {
    const onReplayTutorial = vi.fn();
    render(<GameGuideModal open={true} onClose={vi.fn()} onReplayTutorial={onReplayTutorial} />);
    fireEvent.click(screen.getByRole("button", { name: "전투 튜토리얼 다시 보기" }));
    expect(onReplayTutorial).toHaveBeenCalledOnce();
  });
});
