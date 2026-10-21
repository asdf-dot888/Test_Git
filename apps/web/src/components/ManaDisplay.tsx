interface ManaDisplayProps {
  current: number;
  max: number;
}

export function ManaDisplay({ current, max }: ManaDisplayProps) {
  return (
    <section className="mana-display" aria-label={`마나 ${current}/${max}`}>
      <span className="mana-label">마나</span>
      <strong><span>{current}</span><span aria-hidden="true"> / </span>{max}</strong>
      <div className="mana-orbs" aria-hidden="true">
        {Array.from({ length: max }, (_, index) => (
          <span className={index < current ? "mana-orb is-full" : "mana-orb"} key={index} />
        ))}
      </div>
    </section>
  );
}
