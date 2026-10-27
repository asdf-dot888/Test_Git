// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DiscardPicker } from "./DiscardPicker.js";

describe("DiscardPicker", () => {
  it("shows deck cards and closes the reward flow without selecting a discard", () => {
    const onCancel = vi.fn();
    const cards = [{ instanceId: "deck-card-1", cardId: "bone-rat" }, { instanceId: "deck-card-2", cardId: "ash-wolf" }];
    render(<DiscardPicker cards={cards} disabled={false} title="덱에서 버릴 카드 한 장을 고르세요" description="보상 카드를 추가합니다." rewardCardId="dread-colossus" onDiscard={vi.fn()} onCancel={onCancel} />);
    expect(screen.getByText("공포의 거신")).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
