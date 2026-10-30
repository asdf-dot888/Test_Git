// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { createRun } from "@board-game/game-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GameSessionView } from "./App.js";
import { renderWithTestAuth } from "./App.testUtils.js";
import type { LocalRunController } from "./game/useLocalRun.js";

function makeSync(run = createRun(55)): LocalRunController {
  return {
    status: "ready", etag: null, expiresAt: null, message: null, run, loaded: true, loadVersion: 1,
    saveRun: vi.fn(async () => undefined), createRun: vi.fn(async () => run), replaceRun: vi.fn(async () => run),
    deleteRun: vi.fn(async () => undefined), reload: vi.fn(async () => undefined), retrySave: vi.fn(async () => undefined), retry: vi.fn(async () => undefined),
  };
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("first battle tutorial lifecycle", () => {
  it("starts for an account without a completion record and skip persists completion", async () => {
    renderWithTestAuth(<GameSessionView sync={makeSync()} />);

    fireEvent.click(screen.getByRole("button", { name: "원정 계속하기" }));
    fireEvent.click(screen.getByRole("button", { name: /페이즈 1, 1번째 전투/ }));
    expect(await screen.findByRole("dialog", { name: /손패와 마나 확인/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem("board-card-roguelike:tutorial:v1:test-employee") ?? "null").completed).toBe(true));
    expect(screen.queryByRole("dialog", { name: /손패와 마나 확인/ })).toBeNull();
  });

  it("does not auto-start for a completed account and exposes replay in the game guide", async () => {
    window.localStorage.setItem("board-card-roguelike:tutorial:v1:test-employee", JSON.stringify({
      schemaVersion: 1, userId: "test-employee", completed: true, completedAt: "2026-10-30T03:00:00.000Z",
    }));
    const sync = makeSync();
    renderWithTestAuth(<GameSessionView sync={sync} />);

    fireEvent.click(screen.getByRole("button", { name: "게임 방법" }));
    fireEvent.click(screen.getByRole("button", { name: "전투 튜토리얼 다시 보기" }));
    expect(await screen.findByRole("dialog", { name: /손패와 마나 확인/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));
    expect(await screen.findByRole("button", { name: "게임 방법" })).toBeTruthy();
    const replayRunId = createRun(20261030).runId;
    expect(sync.saveRun.mock.calls.some(([savedRun]) => savedRun.runId === replayRunId)).toBe(false);
    expect(JSON.parse(window.localStorage.getItem("board-card-roguelike:tutorial:v1:test-employee") ?? "null").completedAt).toBe("2026-10-30T03:00:00.000Z");
  });
});
