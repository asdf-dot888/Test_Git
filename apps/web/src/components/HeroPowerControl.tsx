import { PLAYER_CLASS_DEFINITIONS, type PlayerClass } from "@board-game/game-core";

interface HeroPowerControlProps {
  playerClass?: PlayerClass;
  currentMana: number;
  used: boolean;
  active: boolean;
  resolving: boolean;
  shardCount: number;
  boardSize: number;
  targetMode: boolean;
  onActivate(): void;
}

export function HeroPowerControl({ playerClass, currentMana, used, active, resolving, shardCount, boardSize, targetMode, onActivate }: HeroPowerControlProps) {
  if (!playerClass) return null;
  const definition = PLAYER_CLASS_DEFINITIONS.find(({ id }) => id === playerClass)!;
  const ready = currentMana >= 2
    && !used
    && active
    && !resolving
    && (playerClass !== "demonist" || (shardCount >= 3 && boardSize < 5));
  const disabled = !ready && !targetMode;
  return (
    <div className={`hero-power-control${ready || targetMode ? " is-ready" : ""}`}>
      {playerClass === "demonist" && <span className="soul-shard-count" aria-label={`영혼 조각 ${shardCount}/6`}>영혼 조각 {shardCount}/6</span>}
      <button type="button" className="hero-power-button" disabled={disabled} aria-pressed={targetMode} onClick={onActivate} title={definition.heroPowerDescription}>
        <span className="hero-power-cost">2</span>
        <span><strong>{definition.heroPowerName}</strong><small>{definition.heroPowerDescription}</small></span>
        <span className="hero-power-status">{used ? "사용 완료" : ready ? "사용 가능" : "마나 2"}</span>
      </button>
    </div>
  );
}
