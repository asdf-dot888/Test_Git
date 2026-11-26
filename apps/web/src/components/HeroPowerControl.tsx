import { useEffect, useRef, useState } from "react";
import { gameConstants, PLAYER_CLASS_DEFINITIONS, type PlayerClass } from "@board-game/game-core";
import type { DragPayload, DropTarget } from "./dragInteractions.js";
import { useTouchDrag, type DragState } from "./useTouchDrag.js";

const HERO_POWER_PAYLOAD: DragPayload = { kind: "hero-power", instanceId: "hero-power" };

interface HeroPowerControlProps {
  playerClass?: PlayerClass;
  currentMana: number;
  used: boolean;
  /** Player turns the power still rests; 0 = no cooldown. */
  cooldown?: number;
  active: boolean;
  resolving: boolean;
  shardCount: number;
  boardSize: number;
  targetMode: boolean;
  onActivate(): void;
  /** Targets the dragged hero power may be dropped on (touch drag; only the assassin has any). */
  getValidTargets?(payload: DragPayload): DropTarget[];
  onDrop?(payload: DragPayload, target: DropTarget): void;
  onDragStateChange?(state: DragState | null): void;
}

export function HeroPowerControl({ playerClass, currentMana, used, cooldown = 0, active, resolving, shardCount, boardSize, targetMode, onActivate, getValidTargets, onDrop, onDragStateChange }: HeroPowerControlProps) {
  const [showDetails, setShowDetails] = useState(false);
  const dismissTimer = useRef<number | null>(null);
  useEffect(() => () => {
    if (dismissTimer.current !== null) window.clearTimeout(dismissTimer.current);
  }, []);
  const ready = currentMana >= 2
    && !used
    && cooldown === 0
    && active
    && !resolving
    && (playerClass !== "demonist" || (shardCount >= gameConstants.soulShardHeroPowerCost && boardSize < gameConstants.maxBoard));
  // Only the assassin picks a target, so only its button can be dragged. A short press is still a tap (target mode).
  const touchDrag = useTouchDrag({
    payload: HERO_POWER_PAYLOAD,
    origin: "hero-power",
    enabled: playerClass === "assassin" && ready && !targetMode && Boolean(onDrop),
    getValidTargets: () => getValidTargets?.(HERO_POWER_PAYLOAD) ?? [],
    onDrop: (dragged, target) => onDrop?.(dragged, target),
    ...(onDragStateChange ? { onDragStateChange } : {}),
    ghost: () => <span className="hero-power-ghost"><img src={`/art/hero-powers/${playerClass}.png`} alt="" draggable={false} /></span>,
  });
  if (!playerClass) return null;
  const definition = PLAYER_CLASS_DEFINITIONS.find(({ id }) => id === playerClass)!;
  const disabled = !ready && !targetMode;
  const status = used
    ? (cooldown > 0 ? `사용 완료 · ${cooldown}턴 쉰 뒤 다시 사용` : "이번 턴 사용 완료")
    : cooldown > 0
      ? `재사용까지 ${cooldown}턴`
      : !active
      ? "내 턴에 사용할 수 있음"
      : resolving
        ? "행동 처리 중"
        : currentMana < 2
          ? "마나 2 부족"
          : playerClass === "demonist" && shardCount < gameConstants.soulShardHeroPowerCost
            ? `영혼 조각 ${gameConstants.soulShardHeroPowerCost} 부족`
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
    <div className={`hero-power-control${ready || targetMode ? " is-ready" : ""}${showDetails ? " is-showing-details" : ""}${touchDrag.dragging ? " is-dragging" : ""}`}>
      <button
        type="button"
        className={`hero-power-button is-${playerClass}`}
        disabled={disabled}
        aria-label={`${definition.heroPowerName}, 마나 2${playerClass === "demonist" ? `, 영혼 조각 ${gameConstants.soulShardHeroPowerCost}` : ""}${cooldown > 0 ? `, 재사용까지 ${cooldown}턴` : ""}`}
        aria-describedby="hero-power-details"
        aria-pressed={targetMode}
        onClick={handleActivate}
        {...touchDrag.handlers}
      >
        <img className="hero-power-illustration" src={`/art/hero-powers/${playerClass}.png`} alt="" aria-hidden="true" />
        {cooldown > 0 && !used && <span className="hero-power-cooldown" aria-hidden="true">{cooldown}</span>}
        <span className="hero-power-mana-mark" aria-hidden="true">2</span>
        {playerClass === "demonist" && <span className="hero-power-shard-mark" aria-label={`영혼 조각 ${shardCount}/6`}>{shardCount}/6</span>}
      </button>
      {touchDrag.ghostPortal}
      <div id="hero-power-details" className="hero-power-popover" role="tooltip">
        <strong>{definition.heroPowerName}</strong>
        <div className="hero-power-costs">
          <span className="hero-power-cost-badge is-mana"><i aria-hidden="true">◆</i> 마나 <b>2</b></span>
          {playerClass === "demonist" && <span className="hero-power-cost-badge is-shard"><i aria-hidden="true">✦</i> 영혼 조각 <b>{gameConstants.soulShardHeroPowerCost}</b></span>}
        </div>
        <small className="hero-power-cooldown-note">사용 후 {gameConstants.heroPowerCooldownTurns[playerClass]}턴 동안 쉽니다</small>
        {playerClass === "demonist" && <small className="hero-power-shard-total">보유 영혼 조각 {shardCount}/6</small>}
        <p>{definition.heroPowerDescription}</p>
        <small className="hero-power-status">{targetMode ? "대상을 선택하세요" : status}</small>
      </div>
    </div>
  );
}
