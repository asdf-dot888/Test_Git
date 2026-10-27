interface DeckLimitDialogProps {
  disabled?: boolean;
  onConfirm(): void;
  onClose(): void;
}

export function DeckLimitDialog({ disabled = false, onConfirm, onClose }: DeckLimitDialogProps) {
  return (
    <div className="dialog-backdrop">
      <section className="run-card deck-limit-dialog" role="alertdialog" aria-modal="true" aria-labelledby="deck-limit-title">
        <button className="dialog-close" type="button" aria-label="닫기" disabled={disabled} onClick={onClose}>×</button>
        <span className="eyebrow">DECK LIMIT REACHED</span>
        <h2 id="deck-limit-title">덱이 35장으로 가득 찼습니다</h2>
        <p>보상 카드를 고른 뒤 기존 카드 한 장을 버려야 덱에 추가할 수 있습니다.</p>
        <div className="dialog-actions">
          <button className="menu-secondary" type="button" disabled={disabled} onClick={onClose}>보상 닫기</button>
          <button className="menu-primary" type="button" disabled={disabled} onClick={onConfirm}>보상 카드 선택</button>
        </div>
      </section>
    </div>
  );
}
