import { useState } from "react";
import { PLAYER_CLASS_DEFINITIONS, type PlayerClass, type RunDifficulty } from "@board-game/game-core";

interface ClassSelectionScreenProps {
  disabled?: boolean;
  onConfirm(playerClass: PlayerClass, difficulty: RunDifficulty): void;
  onCancel(): void;
}

export function ClassSelectionScreen({ disabled = false, onConfirm, onCancel }: ClassSelectionScreenProps) {
  const [selected, setSelected] = useState<PlayerClass>("warrior");
  const [difficulty, setDifficulty] = useState<RunDifficulty>("normal");
  const selection = PLAYER_CLASS_DEFINITIONS.find(({ id }) => id === selected)!;

  return (
    <main className="class-selection-screen">
      <section className="class-selection-panel" aria-labelledby="class-selection-title">
        <span className="eyebrow">CHOOSE YOUR PATH</span>
        <h1 id="class-selection-title">원정 직업 선택</h1>
        <p>선택한 직업은 이번 원정의 덱과 영웅 능력을 결정합니다.</p>
        <fieldset className="difficulty-choice-group">
          <legend>원정 난이도</legend>
          <label className={`difficulty-choice${difficulty === "normal" ? " is-selected" : ""}`}>
            <input type="radio" name="run-difficulty" value="normal" checked={difficulty === "normal"} disabled={disabled} onChange={() => setDifficulty("normal")} />
            <span><strong>보통</strong><small>기본 규칙으로 원정합니다.</small></span>
          </label>
          <label className={`difficulty-choice difficulty-choice-hard${difficulty === "hard" ? " is-selected" : ""}`}>
            <input type="radio" name="run-difficulty" value="hard" checked={difficulty === "hard"} disabled={disabled} onChange={() => setDifficulty("hard")} />
            <span><strong>어려움</strong><small>강화된 적과 보스 전용 패턴에 도전합니다.</small></span>
          </label>
        </fieldset>
        <div className="class-choice-grid" role="radiogroup" aria-label="원정 직업">
          {PLAYER_CLASS_DEFINITIONS.map((option) => (
            <button
              key={option.id}
              className={`class-choice${selected === option.id ? " is-selected" : ""}`}
              type="button"
              role="radio"
              aria-checked={selected === option.id}
              tabIndex={selected === option.id ? 0 : -1}
              disabled={disabled}
              onClick={() => setSelected(option.id)}
            >
              <img className="class-choice-portrait" src={`/art/heroes/${option.id}.png`} alt={`${option.name} 초상화`} />
              <strong>{option.name}</strong>
              <span>{option.archetype}</span>
              <small>직업 카드 10장 + 공용 카드 20장</small>
            </button>
          ))}
        </div>
        <div className="class-power-preview" aria-live="polite">
          <span>영웅 능력 · 마나 2</span>
          <strong>{selection.heroPowerName}</strong>
          <p>{selection.heroPowerDescription}</p>
        </div>
        <div className="class-selection-actions">
          <button className="menu-secondary" type="button" disabled={disabled} onClick={onCancel}>취소</button>
          <button className="menu-primary" type="button" disabled={disabled} onClick={() => onConfirm(selected, difficulty)}>이 직업으로 원정 시작</button>
        </div>
      </section>
    </main>
  );
}
