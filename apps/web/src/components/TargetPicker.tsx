interface TargetPickerProps {
  mode: "spell" | "attack" | "hero-power";
  onCancel(): void;
}

export function TargetPicker({ mode, onCancel }: TargetPickerProps) {
  return (
    <aside className="target-picker" aria-live="polite">
      <div><strong>{mode === "attack" ? "공격 대상을 선택하세요" : mode === "hero-power" ? "영웅 능력 대상을 선택하세요" : "주문 대상을 선택하세요"}</strong><span>밝은 테두리로 표시된 대상을 고르세요.</span></div>
      <button type="button" onClick={onCancel}>취소</button>
    </aside>
  );
}
