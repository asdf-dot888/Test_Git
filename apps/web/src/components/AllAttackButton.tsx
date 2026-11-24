interface AllAttackButtonProps {
  disabled: boolean;
  readyMinionCount: number;
  enemyHasMinions: boolean;
  onAllAttack(): void;
}

export function AllAttackButton({ disabled, readyMinionCount, enemyHasMinions, onAllAttack }: AllAttackButtonProps) {
  return (
    <button
      className={`all-attack-button${disabled ? " is-unavailable" : " is-ready"}`}
      type="button"
      disabled={disabled}
      aria-label={`전체 공격, 공격 가능한 하수인 ${readyMinionCount}명`}
      onClick={onAllAttack}
      title={enemyHasMinions ? "적 하수인이 남아 있으면 사용할 수 없습니다." : "공격 가능한 아군 하수인을 모두 순서대로 적 영웅에게 보냅니다."}
    >
      <span aria-hidden="true">⚔</span> 전체 공격
    </button>
  );
}
