// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { createRun } from "@board-game/game-core";
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

function makeSync(deleteRun = vi.fn(async () => undefined)): LocalRunController {
  return {
    status: "ready",
    etag: null,
    expiresAt: null,
    message: null,
    run: null,
    loaded: true,
    loadVersion: 0,
    saveRun: vi.fn(async () => undefined),
    createRun: vi.fn(async (seed: number) => createRun(seed)),
    replaceRun: vi.fn(async (_reason: "completed" | "abandoned", seed: number) => createRun(seed)),
    deleteRun,
    reload: vi.fn(async () => undefined),
    retrySave: vi.fn(async () => undefined),
    retry: vi.fn(async () => undefined),
  };
}

async function startGame(sync: LocalRunController) {
  renderWithTestAuth(<GameSessionView sync={sync} />);
  fireEvent.click(screen.getByRole("button", { name: "새 원정 시작" }));
  expect(await screen.findByRole("heading", { name: "원정 경로" })).toBeTruthy();
  fireEvent.click(await screen.findByRole("button", { name: /진행 중/ }));
  await screen.findByRole("button", { name: "메뉴" });
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe("in-game menu flow", () => {
  it("keeps the run until abandonment is confirmed, then returns to the main menu", async () => {
    vi.stubGlobal("Audio", FakeAudio);
    const sync = makeSync();
    await startGame(sync);
    fireEvent.click(screen.getByRole("button", { name: "메뉴" }));
    fireEvent.click(screen.getByRole("button", { name: "메인 메뉴" }));

    expect(screen.getByRole("alertdialog", { name: "현재 판을 포기하고 메인 메뉴로 돌아갈까요?" })).toBeTruthy();
    expect(sync.deleteRun).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "계속 진행" }));
    expect(screen.getByRole("dialog", { name: "게임 메뉴" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "메뉴" })).toBeTruthy();
    expect(sync.deleteRun).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "메인 메뉴" }));
    fireEvent.click(screen.getByRole("button", { name: "포기하고 메인 메뉴로" }));
    await waitFor(() => expect(sync.deleteRun).toHaveBeenCalledWith("abandoned"));
    expect(await screen.findByRole("button", { name: "새 원정 시작" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "메뉴" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "새 원정 시작" }));
    expect(await screen.findByRole("heading", { name: "원정 경로" })).toBeTruthy();
    fireEvent.click(await screen.findByRole("button", { name: /진행 중/ }));
    await screen.findByRole("button", { name: "메뉴" });
    expect(sync.createRun).toHaveBeenCalledTimes(2);
  });

  it("retains the battle and dialog if run deletion fails", async () => {
    vi.stubGlobal("Audio", FakeAudio);
    const deleteRun = vi.fn(async () => { throw new Error("delete failed"); });
    await startGame(makeSync(deleteRun));
    fireEvent.click(screen.getByRole("button", { name: "메뉴" }));
    fireEvent.click(screen.getByRole("button", { name: "메인 메뉴" }));
    fireEvent.click(screen.getByRole("button", { name: "포기하고 메인 메뉴로" }));

    await waitFor(() => expect((screen.getByRole("button", { name: "포기하고 메인 메뉴로" }) as HTMLButtonElement).disabled).toBe(false));
    expect(screen.getByRole("alertdialog", { name: "현재 판을 포기하고 메인 메뉴로 돌아갈까요?" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "메뉴" })).toBeTruthy();
    expect(deleteRun).toHaveBeenCalledOnce();
  });

  it("persists volume controls across menu visits and component mounts", async () => {
    vi.stubGlobal("Audio", FakeAudio);
    const sync = makeSync();
    const first = renderWithTestAuth(<GameSessionView sync={sync} />);
    fireEvent.click(screen.getByRole("button", { name: "새 원정 시작" }));
    expect(await screen.findByRole("heading", { name: "원정 경로" })).toBeTruthy();
    fireEvent.click(await screen.findByRole("button", { name: /진행 중/ }));
    await screen.findByRole("button", { name: "메뉴" });
    fireEvent.click(screen.getByRole("button", { name: "메뉴" }));
    fireEvent.click(screen.getByRole("button", { name: "설정" }));
    fireEvent.change(screen.getByRole("slider", { name: "배경 음악 음량" }), { target: { value: "0.23" } });
    fireEvent.change(screen.getByRole("slider", { name: "효과음 음량" }), { target: { value: "0.64" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "전체 음소거" }));

    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem("board-game:audio-settings") ?? "{}"))
        .toEqual({ musicVolume: 0.23, effectsVolume: 0.64, muted: true });
    });
    first.unmount();

    renderWithTestAuth(<GameSessionView sync={sync} />);
    fireEvent.click(screen.getByRole("button", { name: "새 원정 시작" }));
    expect(await screen.findByRole("heading", { name: "원정 경로" })).toBeTruthy();
    fireEvent.click(await screen.findByRole("button", { name: /진행 중/ }));
    await screen.findByRole("button", { name: "메뉴" });
    fireEvent.click(screen.getByRole("button", { name: "메뉴" }));
    fireEvent.click(screen.getByRole("button", { name: "설정" }));
    expect(screen.getByRole("slider", { name: "배경 음악 음량" })).toHaveProperty("value", "0.23");
    expect(screen.getByRole("slider", { name: "효과음 음량" })).toHaveProperty("value", "0.64");
    expect(screen.getByRole("checkbox", { name: "전체 음소거" })).toHaveProperty("checked", true);
  });
});
