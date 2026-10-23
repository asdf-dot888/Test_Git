import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function TurnStartGlow({ turnId }: { turnId: string | null }) {
  const [visible, setVisible] = useState(Boolean(turnId));

  useEffect(() => {
    if (!turnId) return;
    const timeout = window.setTimeout(() => setVisible(false), 1_000);
    return () => window.clearTimeout(timeout);
  }, [turnId]);

  if (!turnId || !visible || typeof document === "undefined") return null;
  return createPortal(
    <div className="turn-start-glow" aria-hidden="true" data-turn-id={turnId} />,
    document.body,
  );
}
