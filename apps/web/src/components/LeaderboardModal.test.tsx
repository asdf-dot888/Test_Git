// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeaderboardModal } from "./LeaderboardModal.js";
import type { LeaderboardRecord, RunDifficulty } from "../leaderboard/leaderboardClient.js";
import { progressLabel } from "../leaderboard/progressLabel.js";

afterEach(cleanup);

const record: LeaderboardRecord = {
  id: "best-progress",
  userId: "employee-1",
  displayName: "Employee One",
  difficulty: "normal",
  completedBattles: 4,
  recordedAt: "2026-10-26T00:00:00.000Z",
  schemaVersion: 2,
};

function renderModal(options: { open?: boolean; state?: "loading" | "success" | "error"; records?: LeaderboardRecord[]; difficulty?: RunDifficulty; onRetry?: () => void; onDifficultyChange?: (difficulty: RunDifficulty) => void } = {}) {
  return render(<LeaderboardModal
    open={options.open ?? true}
    state={options.state ?? "success"}
    records={options.records ?? []}
    difficulty={options.difficulty ?? "normal"}
    {...(options.state === "error" ? { errorMessage: "연결 실패" } : {})}
    onClose={vi.fn()}
    onRetry={options.onRetry ?? vi.fn()}
    onDifficultyChange={options.onDifficultyChange ?? vi.fn()}
  />);
}

describe("LeaderboardModal", () => {
  it("stays hidden while closed", () => {
    renderModal({ open: false, state: "loading" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows loading, empty, and retryable error states", () => {
    const onRetry = vi.fn();
    const { rerender } = render(<LeaderboardModal open state="loading" records={[]} difficulty="normal" onClose={vi.fn()} onRetry={onRetry} onDifficultyChange={vi.fn()} />);
    expect(screen.getByRole("tablist", { name: "랭킹 난이도" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("불러오는 중");

    rerender(<LeaderboardModal open state="success" records={[]} difficulty="normal" onClose={vi.fn()} onRetry={onRetry} onDifficultyChange={vi.fn()} />);
    expect(screen.getByRole("status").textContent).toContain("아직 등록된");

    rerender(<LeaderboardModal open state="error" records={[]} errorMessage="연결 실패" difficulty="normal" onClose={vi.fn()} onRetry={onRetry} onDifficultyChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows accessible Normal and Hard tabs and requests the selected difficulty", () => {
    const onDifficultyChange = vi.fn();
    renderModal({ difficulty: "normal", onDifficultyChange });
    const normal = screen.getByRole("tab", { name: "보통" });
    const hard = screen.getByRole("tab", { name: "하드" });
    expect(normal.getAttribute("aria-selected")).toBe("true");
    expect(hard.getAttribute("aria-selected")).toBe("false");
    fireEvent.click(hard);
    expect(onDifficultyChange).toHaveBeenCalledWith("hard");
  });

  it("shows rank, employee name, progress, and date without exposing employee ID", () => {
    renderModal({ records: [record] });
    expect(screen.getByText("Employee One")).toBeTruthy();
    expect(screen.getByText(progressLabel(4))).toBeTruthy();
    expect(screen.getByText("2026-10-26")).toBeTruthy();
    expect(screen.getByLabelText("1위")).toBeTruthy();
    expect(screen.queryByText("employee-1")).toBeNull();
  });
});
