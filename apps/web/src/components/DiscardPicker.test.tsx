// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DiscardPicker } from "./DiscardPicker.js";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("DiscardPicker", () => {
  it("shows deck cards and closes the reward flow without selecting a discard", () => {
    const onCancel = vi.fn();
    const cards = [{ instanceId: "deck-card-1", cardId: "bone-rat" }, { instanceId: "deck-card-2", cardId: "ash-wolf" }];
    render(<DiscardPicker cards={cards} disabled={false} title="덱에서 버릴 카드 한 장을 고르세요" description="보상 카드를 추가합니다." rewardCardId="dread-colossus" onDiscard={vi.fn()} onCancel={onCancel} />);
    expect(screen.getByText("공포의 거신")).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("discards from the popup button on touch, after reading the card", () => {
    const onDiscard = vi.fn();
    const cards = [{ instanceId: "deck-card-1", cardId: "bone-rat" }, { instanceId: "deck-card-2", cardId: "ash-wolf" }];
    render(<DiscardPicker cards={cards} disabled={false} onDiscard={onDiscard} />);
    const chip = screen.getByRole("button", { name: /뼈 쥐/ });

    fireEvent.pointerDown(chip, { pointerType: "touch" });
    fireEvent.click(chip);
    expect(onDiscard).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "이 카드 버리기" }));
    expect(onDiscard).toHaveBeenCalledOnce();
    expect(onDiscard).toHaveBeenCalledWith("deck-card-1");
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("opens the added card's details on a touch tap without a discard action", () => {
    const cards = [{ instanceId: "deck-card-1", cardId: "bone-rat" }];
    render(<DiscardPicker cards={cards} disabled={false} rewardCardId="dread-colossus" onDiscard={vi.fn()} />);
    const name = screen.getByRole("button", { name: "공포의 거신" });

    fireEvent.pointerDown(name, { pointerType: "touch" });
    fireEvent.click(name);
    expect(screen.getAllByRole("dialog")[1]?.textContent).toContain("공포의 거신");
    expect(screen.queryByRole("button", { name: "이 카드 버리기" })).toBeNull();
  });

  it("keeps the popup discard button disabled while a discard is being processed", () => {
    const cards = [{ instanceId: "deck-card-1", cardId: "bone-rat" }];
    const { container } = render(<DiscardPicker cards={cards} disabled onDiscard={vi.fn()} />);
    const wrapper = container.querySelector(".discard-card-inspection")!;

    fireEvent.pointerDown(wrapper, { pointerType: "touch" });
    fireEvent.click(wrapper);
    expect((screen.getByRole("button", { name: "이 카드 버리기" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows a fixed-size card preview while hovering or focusing a discard card, and hides it afterwards", () => {
    const cards = [{ instanceId: "deck-card-1", cardId: "bone-rat" }];
    const { container } = render(<DiscardPicker cards={cards} disabled={false} onDiscard={vi.fn()} />);
    const target = container.querySelector(".discard-card-inspection")!;

    expect(document.querySelector(".game-card-hover-preview")).toBeNull();
    fireEvent.mouseEnter(target);
    const preview = document.querySelector<HTMLElement>(".game-card-hover-preview--fixed")!;
    expect(preview.textContent).toContain("뼈 쥐");
    expect(preview.querySelector("img")).toBeTruthy();
    expect(preview.style.width).toBe("220px");
    expect(preview.style.height).toBe("320px");
    fireEvent.mouseLeave(target);
    expect(document.querySelector(".game-card-hover-preview")).toBeNull();

    fireEvent.focus(screen.getByRole("button", { name: /뼈 쥐/ }));
    expect(document.querySelector(".game-card-hover-preview--fixed")).toBeTruthy();
    fireEvent.blur(screen.getByRole("button", { name: /뼈 쥐/ }));
    expect(document.querySelector(".game-card-hover-preview")).toBeNull();
  });

  it("shows the card being added with the same preview in the deck-overflow case", () => {
    const cards = [{ instanceId: "deck-card-1", cardId: "bone-rat" }];
    const { container } = render(<DiscardPicker cards={cards} disabled={false} rewardCardId="dread-colossus" onDiscard={vi.fn()} />);
    fireEvent.mouseEnter(container.querySelector(".reward-added-inspection")!);
    const preview = document.querySelector(".game-card-hover-preview--fixed")!;
    expect(preview.textContent).toContain("공포의 거신");
  });

  it("inspects a discard card on a touch tap without discarding it", () => {
    const onDiscard = vi.fn();
    const cards = [{ instanceId: "deck-card-1", cardId: "bone-rat" }];
    render(<DiscardPicker cards={cards} disabled={false} onDiscard={onDiscard} />);
    const chip = screen.getByRole("button", { name: /뼈 쥐/ });
    fireEvent.pointerDown(chip, { pointerType: "touch" });
    fireEvent.pointerUp(chip, { pointerType: "touch" });
    fireEvent.click(chip);
    expect(screen.getAllByRole("dialog")[1]?.textContent).toContain("뼈 쥐");
    expect(onDiscard).not.toHaveBeenCalled();
  });
});
