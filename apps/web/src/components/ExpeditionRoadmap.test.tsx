// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BOSSES, CARD_CATALOG, NORMAL_ENEMIES_BY_PHASE, createRun } from "@board-game/game-core";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExpeditionRoadmap } from "./ExpeditionRoadmap.js";

afterEach(cleanup);

function makeRun(statuses: Array<"pending" | "active" | "complete"> = ["active", "pending", "pending", "pending"]) {
  const run = createRun(1234);
  run.encounters = run.encounters.map((encounter, index) => ({
    ...encounter,
    status: index < statuses.length ? statuses[index]! : encounter.status,
  }));
  return run;
}

describe("ExpeditionRoadmap", () => {
  it("has a public image for every phase encounter and catalog card", () => {
    const componentDirectory = dirname(fileURLToPath(import.meta.url));
    const enemyArtDirectory = resolve(componentDirectory, "../../public/art/enemies");
    const cardArtDirectory = resolve(componentDirectory, "../../public/art/cards");
    const phaseEnemies = Object.values(NORMAL_ENEMIES_BY_PHASE).flat();

    for (const enemy of [...phaseEnemies, ...BOSSES]) {
      expect(existsSync(resolve(enemyArtDirectory, `${enemy.artKey}.png`)), enemy.artKey).toBe(true);
    }
    for (const card of CARD_CATALOG) {
      expect(existsSync(resolve(cardArtDirectory, `${card.artKey}.png`)), card.artKey).toBe(true);
    }
  });

  it("shows only four encounters from the target phase with matching enemy portraits", () => {
    const run = makeRun();
    const { container } = render(<ExpeditionRoadmap run={run} onSelectEncounter={vi.fn()} onMainMenu={vi.fn()} onLeaderboard={vi.fn()} onAudioSettings={vi.fn()} />);

    expect(screen.getByText("PHASE 1").textContent).toBe("PHASE 1");
    expect(screen.getByText("MANGO STONE")).toBeTruthy();
    expect(container.querySelectorAll(".expedition-roadmap__node")).toHaveLength(4);
    expect(container.querySelectorAll(".expedition-roadmap__node.is-boss")).toHaveLength(1);
    expect(Array.from(container.querySelectorAll(".expedition-roadmap__node img")).every((image) => /^\/art\/enemies\/.+\.png$/.test(image.getAttribute("src") ?? ""))).toBe(true);
    expect(screen.queryByText("PHASE 2")).toBeNull();
    expect(screen.getByRole("button", { name: /보스전/ }).hasAttribute("disabled")).toBe(true);
  });

  it("marks completed portraits grayscale, highlights the active encounter, and only selects it", () => {
    const run = makeRun(["complete", "active", "pending", "pending"]);
    const onSelectEncounter = vi.fn();
    const { container } = render(<ExpeditionRoadmap run={run} onSelectEncounter={onSelectEncounter} onMainMenu={vi.fn()} onLeaderboard={vi.fn()} onAudioSettings={vi.fn()} />);
    const nodes = container.querySelectorAll<HTMLElement>(".expedition-roadmap__node");

    expect(nodes[0]?.classList.contains("is-complete")).toBe(true);
    expect(nodes[1]?.classList.contains("is-active")).toBe(true);
    expect(nodes[1]?.querySelector(".expedition-roadmap__portrait-frame")).not.toBeNull();
    expect(screen.getByRole("button", { name: /진행 중/ }).getAttribute("aria-current")).toBe("step");
    fireEvent.click(screen.getByRole("button", { name: /진행 중/ }));
    fireEvent.click(screen.getAllByRole("button", { name: /잠김/ })[0]!);
    expect(onSelectEncounter).toHaveBeenCalledOnce();
    expect(onSelectEncounter).toHaveBeenCalledWith(1);
  });

  it("allows only the first pending encounter when there is no active encounter", () => {
    const run = makeRun(["complete", "pending", "pending", "pending"]);
    const onSelectEncounter = vi.fn();
    render(<ExpeditionRoadmap run={run} onSelectEncounter={onSelectEncounter} onMainMenu={vi.fn()} onLeaderboard={vi.fn()} onAudioSettings={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /도전 가능/ }));
    expect(onSelectEncounter).toHaveBeenCalledWith(1);
    expect(screen.getAllByRole("button", { name: /잠김/ })).toHaveLength(2);
  });

  it("opens audio settings from the roadmap action button", () => {
    const onAudioSettings = vi.fn();
    render(<ExpeditionRoadmap run={makeRun()} onSelectEncounter={vi.fn()} onMainMenu={vi.fn()} onLeaderboard={vi.fn()} onAudioSettings={onAudioSettings} />);
    fireEvent.click(screen.getByRole("button", { name: "음향 설정" }));
    expect(onAudioSettings).toHaveBeenCalledOnce();
  });

  it("keeps the run unchanged when returning to the main menu and respects disabled state", () => {
    const run = makeRun();
    const originalStatuses = run.encounters.map((encounter) => encounter.status);
    const onMainMenu = vi.fn();
    const onLeaderboard = vi.fn();
    const { rerender } = render(<ExpeditionRoadmap run={run} onSelectEncounter={vi.fn()} onMainMenu={onMainMenu} onLeaderboard={onLeaderboard} onAudioSettings={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "랭킹" }));
    expect(onLeaderboard).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "메인 메뉴" }));
    expect(onMainMenu).toHaveBeenCalledOnce();
    expect(run.encounters.map((encounter) => encounter.status)).toEqual(originalStatuses);

    rerender(<ExpeditionRoadmap run={run} disabled onSelectEncounter={vi.fn()} onMainMenu={onMainMenu} onLeaderboard={onLeaderboard} onAudioSettings={vi.fn()} />);
    expect(screen.getAllByRole("button").every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
  });
});
