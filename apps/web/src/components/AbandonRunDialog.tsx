interface AbandonRunDialogProps {
  open: boolean;
  busy?: boolean;
  onCancel(): void;
  onConfirm(): void;
}

export function AbandonRunDialog({ open, busy = false, onCancel, onConfirm }: AbandonRunDialogProps) {
  if (!open) return null;
  return (
    <div className="dialog-backdrop">
      <section className="run-card abandon-dialog" role="alertdialog" aria-modal="true" aria-labelledby="abandon-title" aria-describedby="abandon-description">
        <span className="eyebrow">CURRENT EXPEDITION</span>
        <h2 id="abandon-title">현재 판을 포기하고 새 판을 시작할까요?</h2>
        <p id="abandon-description">현재 판의 진행 상황은 삭제되며 되돌릴 수 없습니다.</p>
        <div className="dialog-actions">
          <button className="menu-secondary" type="button" disabled={busy} onClick={onCancel}>계속 진행</button>
          <button className="menu-primary" type="button" disabled={busy} onClick={onConfirm}>{busy ? "저장 중…" : "포기하고 새 판 시작"}</button>
        </div>
      </section>
    </div>
  );
}
