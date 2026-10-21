// @vitest-environment jsdom
import type { PropsWithChildren } from "react";
import { act, fireEvent, render, renderHook, waitFor } from "@testing-library/react";
import { createRun } from "@board-game/game-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthContextValue } from "../auth/authState.js";
import { AbandonRunDialog } from "../components/AbandonRunDialog.js";
import { useRunSync } from "./useRunSync.js";

const ownerId = "1d0a0a31-5713-4d1f-96f4-684a1bb5d53a";
const authValue: AuthContextValue = {
  isAuthenticated: true,
  isLoading: false,
  displayName: "Player",
  signIn: vi.fn(async () => undefined),
  signOut: vi.fn(async () => undefined),
  getApiToken: vi.fn(async () => "test-token"),
};

function wrapper({ children }: PropsWithChildren) {
  return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>;
}

describe("useRunSync", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.stubGlobal("crypto", { ...window.crypto, randomUUID: () => ownerId });
  });

  it("loads the authenticated active run and keeps the tab owner stable", async () => {
    const run = createRun(412);
    const fetcher = vi.fn(async () => Response.json({ run, etag: "etag-0", lease: { owned: true, expiresAt: "2026-10-21T10:15:00.000Z" } }));
    vi.stubGlobal("fetch", fetcher);
    const { result } = renderHook(() => useRunSync(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.run?.seed).toBe(412);
    expect(result.current.etag).toBe("etag-0");
    expect(window.sessionStorage.getItem("board-game:run-owner")).toBe(ownerId);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("serializes saves and uses the ETag returned by each preceding activity request", async () => {
    const initialRun = createRun(4);
    const etags: string[] = [];
    let putCount = 0;
    let activityCount = 0;
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (method === "GET") return Response.json({ run: initialRun, etag: "etag-0", lease: { owned: true, expiresAt: "2026-10-21T10:15:00.000Z" } });
      if (method === "PUT") {
        etags.push(new Headers(init?.headers).get("if-match") ?? "missing");
        putCount += 1;
        return Response.json({ run: JSON.parse(init?.body?.toString() ?? "{}").run, etag: `etag-${putCount}` });
      }
      activityCount += 1;
      return Response.json({ etag: `activity-${activityCount}`, expiresAt: "2026-10-21T10:15:00.000Z" });
    });
    vi.stubGlobal("fetch", fetcher);
    const { result } = renderHook(() => useRunSync(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    const firstUpdate = createRun(5);
    const secondUpdate = createRun(6);

    await act(async () => {
      await Promise.all([result.current.saveRun(firstUpdate), result.current.saveRun(secondUpdate)]);
    });

    expect(etags).toEqual(["etag-0", "activity-1"]);
    expect(result.current.etag).toBe("activity-2");
    expect(result.current.run).toBe(secondUpdate);
    expect(result.current.status).toBe("ready");
  });

  it("shows a lease lock without loading another device's run", async () => {
    const fetcher = vi.fn(async () => Response.json({ error: { code: "RUN_LOCKED", message: "busy", expiresAt: "2026-10-21T10:15:00.000Z" } }, { status: 423 }));
    vi.stubGlobal("fetch", fetcher);
    const { result } = renderHook(() => useRunSync(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("locked"));
    expect(result.current.run).toBeNull();
    expect(result.current.expiresAt).toBe("2026-10-21T10:15:00.000Z");
  });

  it("deletes an abandoned run before creating its replacement", async () => {
    const activeRun = createRun(21);
    const replacement = createRun(22);
    const methods: string[] = [];
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      methods.push(method);
      if (method === "GET") return Response.json({ run: activeRun, etag: "etag-active", lease: { owned: true, expiresAt: null } });
      if (method === "DELETE") return new Response(null, { status: 204 });
      return Response.json({ run: replacement, etag: "etag-new" }, { status: 201 });
    });
    vi.stubGlobal("fetch", fetcher);
    const { result } = renderHook(() => useRunSync(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => {
      await expect(result.current.replaceRun("abandoned", replacement.seed)).resolves.toStrictEqual(replacement);
    });

    expect(methods).toEqual(["GET", "DELETE", "POST"]);
    expect(result.current.etag).toBe("etag-new");
    expect(result.current.run).toStrictEqual(replacement);
  });

  it("preserves the locally confirmed run after a recoverable save failure", async () => {
    const initialRun = createRun(9);
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if ((init?.method ?? "GET") === "GET") return Response.json({ run: initialRun, etag: "etag-0", lease: { owned: true, expiresAt: null } });
      return Response.json({ error: { code: "RUN_STORAGE_UNAVAILABLE", message: "temporary" } }, { status: 503 });
    });
    vi.stubGlobal("fetch", fetcher);
    const { result } = renderHook(() => useRunSync(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    const changedRun = createRun(10);

    await act(async () => {
      await expect(result.current.saveRun(changedRun)).rejects.toThrow("temporary");
    });

    expect(result.current.status).toBe("error");
    expect(result.current.run).toStrictEqual(initialRun);
    expect(result.current.etag).toBe("etag-0");
  });
});

describe("AbandonRunDialog", () => {
  it("leaves the current run intact on cancel and confirms replacement only on explicit choice", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    const { getByRole, getByText } = render(<AbandonRunDialog open onCancel={onCancel} onConfirm={onConfirm} />);

    fireEvent.click(getByText("계속 진행"));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(getByRole("button", { name: "포기하고 새 판 시작" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
