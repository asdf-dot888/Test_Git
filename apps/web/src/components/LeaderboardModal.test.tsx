// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LeaderboardModal } from "./LeaderboardModal.js";
import type { LeaderboardRecord } from "../leaderboard/leaderboardClient.js";
import { progressLabel } from "../leaderboard/progressLabel.js";

const record: LeaderboardRecord = {
  id: "best-progress",
  userId: "employee-1",
  displayName: "Employee One",
  completedBattles: 4,
  recordedAt: "2026-10-26T00:00:00.000Z",
  schemaVersion: 1,
};

describe("LeaderboardModal", () => {
  it("stays hidden while closed", () => {
    render(<LeaderboardModal open={false} state="loading" records={[]} onClose={vi.fn()} onRetry={vi.fn()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows loading, empty, and retryable error states in an accessible dialog", () => {
    const onRetry = vi.fn();
    const { rerender } = render(<LeaderboardModal open state="loading" records={[]} onClose={vi.fn()} onRetry={onRetry} />);
    expect(screen.getByRole("dialog", { name: "랭킹" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("불러오는 중");

    rerender(<LeaderboardModal open state="success" records={[]} onClose={vi.fn()} onRetry={onRetry} />);
    expect(screen.getByRole("status").textContent).toContain("등록된 원정 기록");

    rerender(<LeaderboardModal open state="error" records={[]} errorMessage="연결 실패" onClose={vi.fn()} onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows rank, employee name, completed progress, and date without exposing the employee ID", () => {
    render(<LeaderboardModal open state="success" records={[record]} onClose={vi.fn()} onRetry={vi.fn()} />);
    expect(screen.getByText("Employee One")).toBeTruthy();
    expect(screen.getByText("페이즈 1 보스 처치")).toBeTruthy();
    expect(screen.getByText("2026-10-26")).toBeTruthy();
    expect(screen.getByLabelText("1위")).toBeTruthy();
    expect(screen.queryByText("employee-1")).toBeNull();
  });

  it("maps normal battles, phase bosses, and expedition completion to readable labels", () => {
    expect(progressLabel(1)).toBe("페이즈 1 일반전투 1회 승리");
    expect(progressLabel(7)).toBe("페이즈 2 일반전투 3회 승리");
    expect(progressLabel(8)).toBe("페이즈 2 보스 처치");
    expect(progressLabel(12)).toBe("원정 완주");
  });
});
