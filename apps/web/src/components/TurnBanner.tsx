import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export interface TurnBannerProps {
  /** Changes at every turn change; `null` shows nothing. */
  turnKey: string | null;
  side: "player" | "enemy";
}

const BANNER_VISIBLE_MS = 1_000;

/** A centred, non-interactive "내 턴" / "상대 턴" banner shown for about one second at each turn change. */
export function TurnBanner({ turnKey, side }: TurnBannerProps) {
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!turnKey) return undefined;
    const timeout = window.setTimeout(() => setDismissedKey(turnKey), BANNER_VISIBLE_MS);
    return () => window.clearTimeout(timeout);
  }, [turnKey]);

  if (!turnKey || dismissedKey === turnKey || typeof document === "undefined") return null;
  return createPortal(
    <div className={`turn-banner is-${side}`} aria-hidden="true" data-turn-key={turnKey}>
      <span>{side === "player" ? "내 턴" : "상대 턴"}</span>
    </div>,
    document.body,
  );
}
