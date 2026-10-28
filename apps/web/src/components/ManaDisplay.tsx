interface ManaDisplayProps {
  current: number;
  max: number;
  temporary?: number;
}

export function ManaDisplay({ current, max, temporary = 0 }: ManaDisplayProps) {
  const temporaryOrbs = Math.max(0, Math.floor(temporary));
  const regularCurrent = Math.max(0, Math.min(max, current - temporaryOrbs));
  const accessibleLabel = temporaryOrbs > 0
    ? `마나 ${current}/${max}, 임시 마나 ${temporaryOrbs}`
    : `마나 ${current}/${max}`;

  return (
    <section className="mana-display" aria-label={accessibleLabel}>
      <span className="mana-label">마나</span>
      <strong><span>{current}</span><span aria-hidden="true"> / </span>{max}</strong>
      <div className="mana-orbs" aria-hidden="true">
        {Array.from({ length: max }, (_, index) => (
          <span className={index < regularCurrent ? "mana-orb is-full" : "mana-orb"} key={`regular-${index}`} />
        ))}
        {Array.from({ length: temporaryOrbs }, (_, index) => (
          <span className="mana-orb is-full is-temporary" key={`temporary-${index}`} />
        ))}
      </div>
    </section>
  );
}
