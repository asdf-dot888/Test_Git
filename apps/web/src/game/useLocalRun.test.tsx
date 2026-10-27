// @vitest-environment jsdom
import type { PropsWithChildren } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createRun } from "@board-game/game-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthContextValue } from "../auth/authState.js";
import { useLocalRun } from "./useLocalRun.js";

let currentUserId = "employee-a";

function wrapper({ children }: PropsWithChildren) {
  const auth: AuthContextValue = {
    isAuthenticated: true,
    isLoading: false,
    userId: currentUserId,
    displayName: currentUserId,
    getLeaderboardAccessToken: vi.fn(async () => "test-token"),
    signIn: vi.fn(async () => undefined),
    signOut: vi.fn(async () => undefined),
  };
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
  currentUserId = "employee-a";
});

describe("useLocalRun", () => {
  it("loads and saves the authenticated account's run locally", async () => {
    const { result } = renderHook(() => useLocalRun(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.run).toBeNull();

    const run = createRun(412);
    await act(async () => { await result.current.createRun(run.seed, "warrior"); });
    expect(result.current.run?.seed).toBe(412);
    expect(JSON.parse(window.localStorage.getItem("board-card-roguelike:run:v1:employee-a") ?? "null").run.seed).toBe(412);

    currentUserId = "employee-b";
    const second = renderHook(() => useLocalRun(), { wrapper });
    await waitFor(() => expect(second.result.current.status).toBe("ready"));
    expect(second.result.current.run).toBeNull();
    second.unmount();
  });

  it("continues in memory and warns when browser storage is unavailable", async () => {
    vi.stubGlobal("localStorage", {
      getItem() { throw new Error("blocked"); },
      setItem() { throw new Error("blocked"); },
      removeItem() { throw new Error("blocked"); },
    });
    const { result } = renderHook(() => useLocalRun(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.warning).toMatch(/새로고침하거나/);

    const run = createRun(99);
    await act(async () => { await result.current.saveRun(run); });
    expect(result.current.run?.seed).toBe(99);
    expect(result.current.warning).toMatch(/진행 상황을 잃을 수 있습니다/);
  });
});
