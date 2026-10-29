// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EnemyHeroDefeatEffect } from "./EnemyHeroDefeatEffect.js";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("EnemyHeroDefeatEffect", () => {
  it("anchors the cracking flame and ash effect to the enemy portrait and completes", async () => {
    vi.useFakeTimers();
    const complete = vi.fn();
    render(<><div className="battle-board"><section data-effect-anchor="hero:enemy" /></div><EnemyHeroDefeatEffect onComplete={complete} /></>);
    const effect = document.body.querySelector<HTMLElement>(".enemy-hero-defeat");

    expect(effect).not.toBeNull();
    expect(effect?.querySelectorAll(".enemy-defeat-cracks i")).toHaveLength(4);
    expect(effect?.querySelectorAll(".enemy-defeat-ash i")).toHaveLength(9);
    expect(document.querySelector(".battle-board")?.classList.contains("is-enemy-defeat")).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(2_200); });
    expect(complete).toHaveBeenCalledOnce();
  });
});
