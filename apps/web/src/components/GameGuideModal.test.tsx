// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GameGuideModal } from "./GameGuideModal.js";

afterEach(cleanup);

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
    expect(dialog.textContent).toContain("2~3턴에 2, 4~6턴에 3, 7턴부터 4씩");
    expect(dialog.textContent).toContain("양쪽 모두 상대 하수인의 공격력만큼 피해");
    expect(dialog.textContent).toContain("마력의 샘");
    expect(dialog.textContent).toContain("카드 보상을 선택하거나 건너뜁니다");
    expect(dialog.textContent).not.toContain("20초");

    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("describes mouse controls on pointer devices and tap and drag controls on touch devices", () => {
    const { rerender } = render(<GameGuideModal open={true} onClose={vi.fn()} inputMode="pointer" />);
    expect(screen.getByRole("heading", { name: "조작 방법" })).toBeTruthy();
    expect(screen.getByRole("dialog").textContent).toContain("마우스를 올리면 자세한 정보가 보입니다");
    expect(screen.getByRole("dialog").textContent).not.toContain("탭하면");
    expect(screen.getByRole("dialog").textContent).not.toContain("암살자는 버튼을 누른 뒤");

    rerender(<GameGuideModal open={true} onClose={vi.fn()} inputMode="touch" />);
    const text = screen.getByRole("dialog").textContent;
    expect(text).toContain("탭하면 자세한 정보를 볼 수 있고");
    expect(text).toContain("끌어 놓아 사용하고");
    expect(text).toContain("암살자는 버튼을 누른 뒤 적을 탭하거나, 버튼을 적 위로 끌어 놓아 사용합니다");
    expect(text).not.toContain("마우스를 올리면");
  });

  it("offers a tutorial replay action when the menu supplies one", () => {
    const onReplayTutorial = vi.fn();
    render(<GameGuideModal open={true} onClose={vi.fn()} onReplayTutorial={onReplayTutorial} />);
    fireEvent.click(screen.getByRole("button", { name: "전투 튜토리얼 다시 보기" }));
    expect(onReplayTutorial).toHaveBeenCalledOnce();
  });
});
