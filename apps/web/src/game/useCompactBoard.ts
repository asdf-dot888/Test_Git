import { useEffect, useState } from "react";

/** Phone-width boards use the compact layout (the end-turn button moves into the hero panel). Mirrors the 760px CSS breakpoint in board.css. */
export const COMPACT_BOARD_QUERY = "(max-width: 760px)";

function matchesCompactBoard(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(COMPACT_BOARD_QUERY).matches === true;
}

export function useCompactBoard(): boolean {
  const [compact, setCompact] = useState(matchesCompactBoard);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const query = window.matchMedia(COMPACT_BOARD_QUERY);
    const update = () => setCompact(query.matches === true);
    update();
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", update);
      return () => query.removeEventListener("change", update);
    }
    return undefined;
  }, []);
  return compact;
}
