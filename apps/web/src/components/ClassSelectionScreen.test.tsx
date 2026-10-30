// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClassSelectionScreen } from "./ClassSelectionScreen.js";

afterEach(cleanup);

describe("ClassSelectionScreen", () => {
  it("starts with Warrior selected and confirms the selected class", () => {
    const onConfirm = vi.fn();
    const { container } = render(<ClassSelectionScreen onConfirm={onConfirm} onCancel={vi.fn()} />);
    expect(Array.from(container.querySelectorAll(".class-choice-portrait")).map((image) => image.getAttribute("src"))).toEqual([
      "/art/heroes/warrior.png",
      "/art/heroes/assassin.png",
      "/art/heroes/demonist.png",
    ]);
    expect(Array.from(container.querySelectorAll(".class-choice-portrait")).every((image) => Boolean(image.getAttribute("alt")))).toBe(true);
    expect(screen.getByRole("radio", { name: /전사/ }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("radio", { name: /암살자/ }));
    expect(screen.getByText(/선택한 적 하수인 또는 적 영웅/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "이 직업으로 원정 시작" }));
    expect(onConfirm).toHaveBeenCalledWith("assassin", "normal");
  });

  it("defaults to Normal and passes the selected difficulty", () => {
    const onConfirm = vi.fn();
    render(<ClassSelectionScreen onConfirm={onConfirm} onCancel={vi.fn()} />);
    expect((screen.getByRole("radio", { name: /보통/ }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: /어려움/ }));
    fireEvent.click(screen.getByRole("button", { name: "이 직업으로 원정 시작" }));
    expect(onConfirm).toHaveBeenCalledWith("warrior", "hard");
  });

  it("allows cancellation and disables both actions while creating a run", () => {
    const onCancel = vi.fn();
    const { rerender } = render(<ClassSelectionScreen onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(onCancel).toHaveBeenCalledOnce();
    rerender(<ClassSelectionScreen disabled onConfirm={vi.fn()} onCancel={onCancel} />);
    expect((screen.getByRole("button", { name: "취소" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "이 직업으로 원정 시작" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
