// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VictoryScreen } from "./VictoryScreen.js";

describe("VictoryScreen", () => {
  afterEach(cleanup);
  it("shows the victory title and confirms into the reward flow", () => {
    const onConfirm = vi.fn();
    render(<VictoryScreen onConfirm={onConfirm} />);
    expect(screen.getByRole("heading", { name: "승리" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "확인" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("disables confirmation while run state is saving", () => {
    render(<VictoryScreen disabled onConfirm={vi.fn()} />);
    expect(screen.getByRole("button", { name: "확인" }).hasAttribute("disabled")).toBe(true);
  });
});
