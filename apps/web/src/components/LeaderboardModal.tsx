import type { ReactElement } from "react";
import { createPortal } from "react-dom";
import type { LeaderboardRecord, RunDifficulty } from "../leaderboard/leaderboardClient.js";
import { progressLabel } from "../leaderboard/progressLabel.js";

export type LeaderboardLoadState = "loading" | "success" | "error";

interface LeaderboardModalProps {
  open: boolean;
  state: LeaderboardLoadState;
  records: LeaderboardRecord[];
  difficulty: RunDifficulty;
  errorMessage?: string;
  onClose(): void;
  onRetry(): void;
  onDifficultyChange(difficulty: RunDifficulty): void;
}

export function LeaderboardModal({ open, state, records, difficulty, errorMessage, onClose, onRetry, onDifficultyChange }: LeaderboardModalProps): ReactElement | null {
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
        <div className="leaderboard-tabs" role="tablist" aria-label="랭킹 난이도">
          {(["normal", "hard"] as const).map((tabDifficulty) => (
            <button
              key={tabDifficulty}
              id={`leaderboard-tab-${tabDifficulty}`}
              className={`leaderboard-tab${difficulty === tabDifficulty ? " is-selected" : ""}`}
              type="button"
              role="tab"
              aria-selected={difficulty === tabDifficulty}
              aria-controls="leaderboard-list-panel"
              onClick={() => onDifficultyChange(tabDifficulty)}
            >
              {tabDifficulty === "normal" ? "보통" : "하드"}
            </button>
          ))}
        </div>
        <div id="leaderboard-list-panel" role="tabpanel" aria-labelledby={`leaderboard-tab-${difficulty}`}>
        {state === "loading" && <p className="leaderboard-state" role="status">랭킹을 불러오는 중…</p>}
        {state === "error" && (
          <div className="leaderboard-state leaderboard-state--error" role="alert">
            <p>{errorMessage ?? "랭킹을 불러오지 못했습니다."}</p>
            <button className="menu-secondary" type="button" onClick={onRetry}>다시 시도</button>
          </div>
        )}
        {state === "success" && records.length === 0 && <p className="leaderboard-state" role="status">아직 등록된 원정 기록이 없습니다.</p>}
        {state === "success" && records.length > 0 && (
          <ol className="leaderboard-list" aria-label={`${difficulty === "normal" ? "보통" : "하드"} 상위 10명 랭킹`}>
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
        </div>
      </section>
    </div>,
    document.body,
  );
}
