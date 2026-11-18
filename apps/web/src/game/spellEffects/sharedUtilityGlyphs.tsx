import type { ReactNode } from "react";

/** Unique SVG glyphs (64x64, stroke-based) for the shared utility spells. */
export const SHARED_UTILITY_GLYPHS: Readonly<Record<string, ReactNode>> = {
  // Cloud with falling drops.
  "healing-mist": <><path d="M12 40 C12 32 20 28 28 32 C32 24 44 26 46 34 C54 34 56 44 48 48 H18 C12 48 10 44 12 40 Z" /><path d="M24 54 V58 M34 54 V60 M44 54 V58" /></>,
  // Needle with a stitched thread.
  "life-thread": <><path d="M44 8 L20 56" /><circle cx="42" cy="14" r="3" /><path d="M20 56 C10 52 14 42 24 44 C34 46 30 32 40 34 C48 36 46 26 52 24" /></>,
  // Water drop.
  "mana-spring": <><path d="M32 8 C42 24 48 32 48 40 C48 50 40 56 32 56 C24 56 16 50 16 40 C16 32 22 24 32 8 Z" /><path d="M24 42 C26 48 32 50 38 46" /></>,
  // Contract card with a flame at its corner.
  "soul-bargain": <><rect x="14" y="10" width="26" height="38" rx="3" /><path d="M20 20 H34 M20 28 H34 M20 36 H28" /><path d="M42 54 C40 46 48 42 46 34 C54 40 58 50 52 56 C48 58 44 58 42 54 Z" /></>,
  // Crossed bones.
  "raise-bones": <><path d="M14 18 L50 46 M50 18 L14 46" /><circle cx="12" cy="16" r="4" /><circle cx="52" cy="16" r="4" /><circle cx="12" cy="48" r="4" /><circle cx="52" cy="48" r="4" /></>,
  // Rune inside a ring.
  "rune-surge": <><circle cx="32" cy="32" r="24" /><path d="M24 18 V46 M24 18 L40 30 L24 38 M40 30 V46" /></>,
  // Open eye.
  "dark-insight": <><path d="M6 32 C16 16 48 16 58 32 C48 48 16 48 6 32 Z" /><circle cx="32" cy="32" r="9" /><circle cx="32" cy="32" r="3" /></>,
  // Hand reaching for a card.
  "stolen-fate": <><path d="M14 54 V34 C14 30 20 30 20 34 V26 C20 22 26 22 26 26 V24 C26 20 32 20 32 24 V28 C32 24 38 24 38 28 V42 C38 50 34 54 28 54 Z" /><rect x="36" y="8" width="18" height="26" rx="2" /></>,
};
