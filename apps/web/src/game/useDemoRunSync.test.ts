// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRun } from "@board-game/game-core";
import { renderHook } from "@testing-library/react";
import { useDemoRunSync } from "./useDemoRunSync.js";

describe("useDemoRunSync", () => {
  afterEach(() => vi.restoreAllMocks());

  it("is ready without loading a remote run", () => {
    const { result } = renderHook(() => useDemoRunSync());
    expect(result.current).toMatchObject({ status: "ready", loaded: true, run: null, etag: null });
  });

  it("creates runs with the shared game engine and keeps no saved run", async () => {
    const { result } = renderHook(() => useDemoRunSync());
    await expect(result.current.createRun(712)).resolves.toEqual(createRun(712));
    expect(result.current.run).toBeNull();
  });

  it("does not call fetch or browser storage for sync operations", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const localStorageSet = vi.spyOn(window.localStorage, "setItem");
    const sessionStorageSet = vi.spyOn(window.sessionStorage, "setItem");
    const { result } = renderHook(() => useDemoRunSync());
    const run = createRun(33);

    await result.current.saveRun(run);
    await result.current.replaceRun("abandoned", 34);
    await result.current.deleteRun("abandoned");
    await result.current.reload();
    await result.current.retrySave(run);
    await result.current.retry();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(localStorageSet).not.toHaveBeenCalled();
    expect(sessionStorageSet).not.toHaveBeenCalled();
  });
});
