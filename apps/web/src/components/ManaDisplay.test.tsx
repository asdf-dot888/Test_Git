// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ManaDisplay } from "./ManaDisplay.js";

describe("ManaDisplay", () => {
  it("renders regular mana with ten maximum orbs", () => {
    const { container } = render(<ManaDisplay current={5} max={10} />);
    const display = screen.getByRole("region", { name: "마나 5/10" });
    expect(display.textContent).toContain("5");
    expect(container.querySelectorAll(".mana-orb")).toHaveLength(10);
    expect(container.querySelectorAll(".mana-orb.is-full")).toHaveLength(5);
    expect(container.querySelectorAll(".mana-orb.is-temporary")).toHaveLength(0);
  });

  it("shows temporary mana beyond the normal maximum with a distinct accessible label", () => {
    const { container } = render(<ManaDisplay current={13} max={10} temporary={3} />);
    screen.getByRole("region", { name: "마나 13/10, 임시 마나 3" });
    expect(container.querySelectorAll(".mana-orb")).toHaveLength(13);
    expect(container.querySelectorAll(".mana-orb.is-full")).toHaveLength(13);
    expect(container.querySelectorAll(".mana-orb.is-temporary")).toHaveLength(3);
    expect(container.textContent).toContain("13");
    expect(container.textContent).toContain("10");
  });

  it("shows spent temporary mana separately from regular mana", () => {
    const { container } = render(<ManaDisplay current={7} max={10} temporary={2} />);
    screen.getByRole("region", { name: "마나 7/10, 임시 마나 2" });
    expect(container.querySelectorAll(".mana-orb")).toHaveLength(12);
    expect(container.querySelectorAll(".mana-orb.is-full")).toHaveLength(7);
    expect(container.querySelectorAll(".mana-orb.is-temporary")).toHaveLength(2);
  });

  it("keeps legacy callers readable when temporary mana is zero", () => {
    const { container } = render(<ManaDisplay current={0} max={10} temporary={0} />);
    screen.getByRole("region", { name: "마나 0/10" });
    expect(container.querySelectorAll(".mana-orb")).toHaveLength(10);
    expect(container.querySelectorAll(".mana-orb.is-full")).toHaveLength(0);
  });
});
