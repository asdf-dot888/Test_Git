import type { ReactNode } from "react";

type TurnStatus = "active" | "playerWon" | "playerLost";

interface EndTurnButtonProps {
  onEndTurn(): void;
  status: TurnStatus;
  disabled?: boolean;
  className?: string;
}

export function EndTurnButton({ onEndTurn, status, disabled = false, className }: EndTurnButtonProps) {
  return (
    <button className={`end-turn-button${className ? ` ${className}` : ""}`} type="button" onClick={onEndTurn} disabled={disabled || status !== "active"}>
      턴 종료 <span aria-hidden="true">↗</span>
    </button>
  );
}

interface TurnControlsProps {
  onEndTurn(): void;
  status: TurnStatus;
  disabled?: boolean;
  /** Controls drawn before the end-turn button (the all-attack button). */
  leading?: ReactNode;
  /** The compact phone layout shows the end-turn button inside the hero panel instead. */
  showEndTurn?: boolean;
}

const statusText = { active: "내 턴", playerWon: "전투 승리", playerLost: "전투 패배" };

export function TurnControls({ onEndTurn, status, disabled = false, leading, showEndTurn = true }: TurnControlsProps) {
  return (
    <div className="turn-controls">
      {leading}
      <span className={`turn-status status-${status}`} role="status">{statusText[status]}</span>
      {showEndTurn && <EndTurnButton onEndTurn={onEndTurn} status={status} disabled={disabled} />}
    </div>
  );
}
