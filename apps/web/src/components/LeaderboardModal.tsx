import type { ReactElement } from "react";
import { createPortal } from "react-dom";
import type { LeaderboardRecord } from "../leaderboard/leaderboardClient.js";
import { progressLabel } from "../leaderboard/progressLabel.js";

export type LeaderboardLoadState = "loading" | "success" | "error";

interface LeaderboardModalProps {
  open: boolean;
  state: LeaderboardLoadState;
  records: LeaderboardRecord[];
  errorMessage?: string;
  onClose(): void;
  onRetry(): void;
}

export function LeaderboardModal({ open, state, records, errorMessage, onClose, onRetry }: LeaderboardModalProps): ReactElement | null {
  if (!open) return null;

  return createPortal(
    <div className="leaderboard-backdrop">
      <section className="leaderboard-panel" role="dialog" aria-modal="true" aria-labelledby="leaderboard-title">
        <header className="leaderboard-header">
          <span className="eyebrow">MANGO STONE</span>
          <button className="menu-secondary" type="button" onClick={onClose}>닫기</button>
        </header>
        <h2 id="leaderboard-title">랭킹</h2>
        <p className="leaderboard-description">가장 멀리 원정을 완료한 사내 플레이어 10명입니다.</p>
        {state === "loading" && <p className="leaderboard-state" role="status">랭킹을 불러오는 중…</p>}
        {state === "error" && (
          <div className="leaderboard-state leaderboard-state--error" role="alert">
            <p>{errorMessage ?? "랭킹을 불러오지 못했습니다."}</p>
            <button className="menu-secondary" type="button" onClick={onRetry}>다시 시도</button>
          </div>
        )}
        {state === "success" && records.length === 0 && <p className="leaderboard-state" role="status">아직 등록된 원정 기록이 없습니다.</p>}
        {state === "success" && records.length > 0 && (
          <ol className="leaderboard-list" aria-label="상위 10명 랭킹">
            {records.slice(0, 10).map((record, index) => (
              <li className="leaderboard-row" key={record.userId}>
                <span className={`leaderboard-rank${index < 3 ? " is-top-three" : ""}`} aria-label={`${index + 1}위`}>{String(index + 1).padStart(2, "0")}</span>
                <span className="leaderboard-player">
                  <strong>{record.displayName}</strong>
                  <span>{progressLabel(record.completedBattles)}</span>
                </span>
                <time className="leaderboard-date" dateTime={record.recordedAt}>{record.recordedAt.slice(0, 10)}</time>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>,
    document.body,
  );
}
