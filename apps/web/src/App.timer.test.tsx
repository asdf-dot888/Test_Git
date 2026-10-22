// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRun, type RunState } from "@board-game/game-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_AUDIO_SETTINGS } from "./game/audioSettings.js";
import { GameSessionView } from "./App.js";
import type { RunSyncController } from "./game/useRunSync.js";

class FakeAudio {
  loop = false;
  volume = 1;
  currentTime = 0;
  paused = true;
  onended: (() => void) | null = null;

  constructor(public src: string, private readonly players: FakeAudio[]) { players.push(this); }
  play(): Promise<void> { this.paused = false; return Promise.resolve(); }
  pause(): void { this.paused = true; }
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.localStorage.clear();
});

describe("turn timer application wiring", () => {
  it("persists pause/resume snapshots, avoids per-tick saves, and alerts at 40% SFX volume", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(100_000);
    const players: FakeAudio[] = [];
    vi.stubGlobal("Audio", class extends FakeAudio {
      constructor(src: string) { super(src, players); }
    });
    const run = createRun(71);
    run.battle!.hand = [{ instanceId: "timer-minion", cardId: "ash-wolf" }];
    const savedRuns: RunState[] = [];
    const saveRun = vi.fn(async (savedRun: RunState) => { savedRuns.push(savedRun); });
    const sync: RunSyncController = {
      status: "ready", etag: "etag-1", expiresAt: null, message: null, run, loaded: true, loadVersion: 1,
      saveRun,
      createRun: vi.fn(async () => run), replaceRun: vi.fn(async () => run), deleteRun: vi.fn(async () => undefined),
      reload: vi.fn(async () => undefined), retrySave: vi.fn(async () => undefined), retry: vi.fn(async () => undefined),
    };

    const { container } = render(<GameSessionView sync={sync} />);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(savedRuns.some((saved) => saved.turnTimer?.pausedRemainingMs === 20_000)).toBe(true);
    expect(savedRuns.at(-1)?.turnTimer).toMatchObject({ deadlineAt: null, pausedRemainingMs: 20_000 });

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "원정 계속하기" })); await Promise.resolve(); });
    expect(savedRuns.at(-1)?.turnTimer?.deadlineAt).toBe(120_000);
    expect(savedRuns.at(-1)?.turnTimer?.pausedRemainingMs).toBeNull();
    expect(screen.getByText("00:20")).toBeTruthy();
    expect(container.querySelector(".turn-timer")?.className).not.toContain("is-hidden");
    fireEvent.click(container.querySelector(".menu-button")!);
    expect(container.querySelector(".turn-timer")?.className).toContain("is-hidden");
    fireEvent.click(container.querySelector(".game-menu-panel .menu-primary")!);
    expect(container.querySelector(".turn-timer")?.className).not.toContain("is-hidden");
    const saveCountAfterResume = saveRun.mock.calls.length;
    const warningsBeforeCountdown = players.filter((player) => player.src === "/audio/sfx/timer-warning.ogg").length;

    for (let second = 0; second < 15; second += 1) {
      await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
    }
    expect(screen.getByText("00:05").className).toContain("is-critical");
    for (let second = 0; second < 4; second += 1) {
      await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
    }
    expect(saveRun).toHaveBeenCalledTimes(saveCountAfterResume);
    const warningPlayers = players.filter((player) => player.src === "/audio/sfx/timer-warning.ogg").slice(warningsBeforeCountdown);
    expect(warningPlayers).toHaveLength(5);
    expect(warningPlayers.every((player) => player.volume === DEFAULT_AUDIO_SETTINGS.effectsVolume * 0.4)).toBe(true);

    const minionCard = screen.getByRole("button", { name: /잿빛 늑대/ });
    fireEvent.pointerDown(minionCard);
    fireEvent.click(minionCard);
    const timer = screen.getByText("00:01");
    expect(timer.className).toContain("is-hidden");
    expect(savedRuns.at(-1)?.turnTimer).toMatchObject({ deadlineAt: null, pausedRemainingMs: 1_000 });

    await act(async () => { await vi.advanceTimersByTimeAsync(1_400); });
    expect(screen.getByText("00:01").className).not.toContain("is-hidden");
    expect(savedRuns.at(-1)?.turnTimer).toMatchObject({ deadlineAt: Date.now() + 1_000, pausedRemainingMs: null });
  });
});
