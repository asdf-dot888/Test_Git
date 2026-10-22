import type { ReactElement } from "react";

export interface EnemyHandProps {
  count: number;
  maxVisible?: number;
  instanceIds?: readonly string[];
}

export function EnemyHand({ count, maxVisible = 10, instanceIds = [] }: EnemyHandProps): ReactElement {
  const visibleCount = Math.max(0, Math.min(count, maxVisible));
  return (
    <div className="enemy-hand" role="group" aria-label={`적 손패 ${count}장`}>
      {Array.from({ length: visibleCount }, (_, index) => (
        <span
          className="enemy-card-back"
          data-effect-instance-id={instanceIds[index]}
          key={instanceIds[index] ?? `enemy-card-back-${index}`}
          aria-hidden="true"
        ><span>✦</span></span>
      ))}
      {count > maxVisible && <span className="enemy-hand-overflow" aria-hidden="true">+{count - maxVisible}</span>}
    </div>
  );
}
