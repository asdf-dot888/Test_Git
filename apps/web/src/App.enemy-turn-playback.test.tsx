// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { createRun, type RunState } from "@board-game/game-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GameSessionView } from "./App.js";
import { renderWithTestAuth } from "./App.testUtils.js";
import type { LocalRunController } from "./game/useLocalRun.js";

class FakeAudio {
  loop = false;
  volume = 1;
  currentTime = 0;
  paused = true;
  onended: (() => void) | null = null;

  constructor(public src: string) {}
  play(): Promise<void> { this.paused = false; return Promise.resolve(); }
  pause(): void { this.paused = true; }
}

function syncWith(run: RunState): LocalRunController {
  return {
    status: "ready", etag: null, expiresAt: null, message: null, run, loaded: true, loadVersion: 1,
    saveRun: vi.fn(async () => undefined), createRun: vi.fn(async () => run), replaceRun: vi.fn(async () => run),
    deleteRun: vi.fn(async () => undefined), reload: vi.fn(async () => undefined), retrySave: vi.fn(async () => undefined), retry: vi.fn(async () => undefined),
  };
}

function enterActiveEncounter(): void {
  fireEvent.click(screen.getByRole("button", { name: "원정 계속하기" }));
  const activeEncounter = document.querySelector<HTMLButtonElement>(".expedition-roadmap__node-button[aria-current='step']");
  if (!activeEncounter) throw new Error("The current expedition encounter was not available.");
  fireEvent.click(activeEncounter);
}

async function advance(ms: number): Promise<void> {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}

async function advanceUntil(predicate: () => boolean, limitMs = 8_000): Promise<void> {
  for (let elapsed = 0; elapsed < limitMs && !predicate(); elapsed += 100) await advance(100);
  if (!predicate()) throw new Error("Timed out waiting for enemy playback state.");
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("enemy turn playback in the game screen", () => {
  it("previews enemy actions before effects, highlights targets, and pauses intent on the menu", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(100_000);
    vi.stubGlobal("Audio", FakeAudio);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0));
    vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
    const run = createRun(801);
    run.battle!.enemyMana.current = 1;
    run.battle!.enemyHand = [{ instanceId: "enemy-summon", cardId: "ash-wolf" }];
    run.battle!.enemyDrawPile = [{ instanceId: "enemy-expensive", cardId: "eclipse" }];
    run.battle!.enemyBoard = [{ instanceId: "enemy-attacker", cardId: "bone-rat", owner: "enemy", attack: 1, health: 4, maxHealth: 4, summonedTurn: 0, hasAttacked: false }];
    run.battle!.playerBoard = [{ instanceId: "player-target", cardId: "ash-wolf", owner: "player", attack: 1, health: 5, maxHealth: 5, summonedTurn: 0, hasAttacked: false }];
    renderWithTestAuth(<GameSessionView sync={syncWith(run)} />);
    await act(async () => { await Promise.resolve(); });
    expect(document.body.querySelector(".turn-start-glow")).toBeNull();
    enterActiveEncounter();
    fireEvent.click(screen.getByRole("button", { name: /턴 종료/ }));
    await advance(80);
    await advance(0);

    expect((screen.getByRole("button", { name: "턴 종료" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /아군 하수인 잿빛 늑대/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("enemy-intent-preview").textContent).toContain("적의 행동 예고");
    expect(screen.getByTestId("enemy-intent-preview").textContent).toContain("잿빛 늑대 소환");
    expect(screen.getByRole("button", { name: /아군 하수인 잿빛 늑대.*체력 5\/5/ })).toBeTruthy();

    await advance(400);
    fireEvent.click(screen.getByRole("button", { name: "메뉴" }));
    expect(screen.getByRole("dialog", { name: "게임 메뉴" })).toBeTruthy();
    expect(document.body.querySelector(".enemy-intent-preview")).toBeTruthy();
    await advance(5_000);
    expect(screen.getByRole("button", { name: /아군 하수인 잿빛 늑대.*체력 5\/5/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "돌아가기" }));
    await advance(599);
    expect(screen.queryByRole("button", { name: /적 하수인 잿빛 늑대/ })).toBeNull();
    await advance(1);
    await advance(0);
    expect(screen.getByRole("button", { name: /아군 하수인 잿빛 늑대.*체력 5\/5/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /적 하수인 잿빛 늑대/ })).toBeTruthy();
    await advanceUntil(() => screen.queryByTestId("enemy-intent-preview")?.textContent.includes("의 공격") ?? false);
    expect(screen.getByTestId("enemy-intent-preview").textContent).toContain("의 공격");
    expect(document.querySelector(".lane-player .is-intent-target")).toBeTruthy();
    await advance(1_000);
    await advance(0);
    expect(screen.getByRole("button", { name: /아군 하수인 잿빛 늑대.*체력 4\/5/ })).toBeTruthy();
    expect(document.body.querySelectorAll(".combat-effect-impact")).toHaveLength(2);

    await advanceUntil(() => !screen.queryByTestId("enemy-intent-preview"));
    expect(screen.queryByTestId("enemy-intent-preview")).toBeNull();
  });

  it("shows the lethal action before routing to the defeat screen", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(200_000);
    vi.stubGlobal("Audio", FakeAudio);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0));
    vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
    const run = createRun(802);
    run.battle!.enemyMana.current = 0;
    run.battle!.enemyHand = [];
    run.battle!.enemyDrawPile = [{ instanceId: "enemy-expensive", cardId: "eclipse" }];
    run.battle!.enemyBoard = [{ instanceId: "enemy-attacker", cardId: "bone-rat", owner: "enemy", attack: 3, health: 3, maxHealth: 3, summonedTurn: 0, hasAttacked: false }];
    run.battle!.playerHero.health = 1;
    renderWithTestAuth(<GameSessionView sync={syncWith(run)} />);
    await act(async () => { await Promise.resolve(); });
    enterActiveEncounter();
    fireEvent.click(screen.getByRole("button", { name: /턴 종료/ }));
    await advance(80);
    await advance(0);

    expect(screen.queryByText("원정이 끝났습니다")).toBeNull();
    expect(screen.getByLabelText("체력 1/30")).toBeTruthy();
    expect(screen.getByTestId("enemy-intent-preview")).toBeTruthy();
    await advance(1_000);
    await advance(0);
    expect(screen.getByLabelText("체력 0/30")).toBeTruthy();
    expect(document.body.querySelector(".combat-effect-impact")).toBeTruthy();
    await advance(1_400);
    await advance(999);
    expect(screen.queryByText("원정이 끝났습니다")).toBeNull();
    await advance(1);
    expect(screen.getByText("원정이 끝났습니다")).toBeTruthy();
  });
});
