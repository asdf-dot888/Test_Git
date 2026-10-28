import { useEffect, useRef, useState } from "react";
import { gameConstants, PLAYER_CLASS_DEFINITIONS, type PlayerClass } from "@board-game/game-core";

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
  const [showDetails, setShowDetails] = useState(false);
  const dismissTimer = useRef<number | null>(null);
  useEffect(() => () => {
    if (dismissTimer.current !== null) window.clearTimeout(dismissTimer.current);
  }, []);
  if (!playerClass) return null;
  const definition = PLAYER_CLASS_DEFINITIONS.find(({ id }) => id === playerClass)!;
  const ready = currentMana >= 2
    && !used
    && active
    && !resolving
    && (playerClass !== "demonist" || (shardCount >= 3 && boardSize < gameConstants.maxBoard));
  const disabled = !ready && !targetMode;
  const status = used
    ? "이번 턴 사용 완료"
    : !active
      ? "내 턴에 사용할 수 있음"
      : resolving
        ? "행동 처리 중"
        : currentMana < 2
          ? "마나 2 부족"
          : playerClass === "demonist" && shardCount < 3
            ? "영혼 조각 3 부족"
            : playerClass === "demonist" && boardSize >= gameConstants.maxBoard
              ? "필드가 가득 참"
              : "사용 가능";

  const handleActivate = () => {
    setShowDetails(true);
    if (dismissTimer.current !== null) window.clearTimeout(dismissTimer.current);
    dismissTimer.current = window.setTimeout(() => setShowDetails(false), 2400);
    onActivate();
  };

  return (
    <div className={`hero-power-control${ready || targetMode ? " is-ready" : ""}${showDetails ? " is-showing-details" : ""}`}>
      <button
        type="button"
        className={`hero-power-button is-${playerClass}`}
        disabled={disabled}
        aria-label={`${definition.heroPowerName}, 마나 2${playerClass === "demonist" ? ", 영혼 조각 3" : ""}`}
        aria-describedby="hero-power-details"
        aria-pressed={targetMode}
        onClick={handleActivate}
      >
        <img className="hero-power-illustration" src={`/art/hero-powers/${playerClass}.png`} alt="" aria-hidden="true" />
        <span className="hero-power-mana-mark" aria-hidden="true">2</span>
        {playerClass === "demonist" && <span className="hero-power-shard-mark" aria-label={`영혼 조각 ${shardCount}/6`}>{shardCount}/6</span>}
      </button>
      <div id="hero-power-details" className="hero-power-popover" role="tooltip">
        <strong>{definition.heroPowerName}</strong>
        <div className="hero-power-costs">
          <span className="hero-power-cost-badge is-mana"><i aria-hidden="true">◆</i> 마나 <b>2</b></span>
          {playerClass === "demonist" && <span className="hero-power-cost-badge is-shard"><i aria-hidden="true">✦</i> 영혼 조각 <b>3</b></span>}
        </div>
        {playerClass === "demonist" && <small className="hero-power-shard-total">보유 영혼 조각 {shardCount}/6</small>}
        <p>{definition.heroPowerDescription}</p>
        <small className="hero-power-status">{targetMode ? "대상을 선택하세요" : status}</small>
      </div>
    </div>
  );
}
