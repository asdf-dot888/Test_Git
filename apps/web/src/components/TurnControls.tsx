interface TurnControlsProps {
  onEndTurn(): void;
  status: "active" | "playerWon" | "playerLost";
}

const statusText = { active: "내 턴", playerWon: "전투 승리", playerLost: "전투 패배" };

export function TurnControls({ onEndTurn, status }: TurnControlsProps) {
  return (
    <div className="turn-controls">
      <span className={`turn-status status-${status}`} role="status">{statusText[status]}</span>
      <button className="end-turn-button" type="button" onClick={onEndTurn} disabled={status !== "active"}>
        턴 종료 <span aria-hidden="true">↗</span>
      </button>
    </div>
  );
}
