interface RunLockNoticeProps {
  title?: string;
  message: string;
  expiresAt?: string | null;
  retryLabel?: string;
  onRetry(): void;
}

export function RunLockNotice({ title = "다른 기기에서 진행 중입니다", message, expiresAt, retryLabel = "다시 확인", onRetry }: RunLockNoticeProps) {
  const expiryLabel = expiresAt ? new Date(expiresAt).toLocaleTimeString() : null;
  return (
    <main className="run-sync-screen">
      <section className="run-card run-sync-card" role="alert">
        <span className="eyebrow">EXPEDITION SYNC</span>
        <h1>{title}</h1>
        <p>{message}</p>
        {expiryLabel && <p className="run-sync-expiry">세션 잠금 해제 예상: {expiryLabel}</p>}
        <button className="menu-primary" type="button" onClick={onRetry}>{retryLabel}</button>
      </section>
    </main>
  );
}
