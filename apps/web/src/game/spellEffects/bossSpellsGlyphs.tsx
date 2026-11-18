import type { ReactNode } from "react";

/** Unique SVG glyphs (64x64, stroke-based) for the boss-only spells. */
export const BOSS_SPELL_GLYPHS: Readonly<Record<string, ReactNode>> = {
  // Thorny vines forming a cage.
  "matron-thorn-prison": <><path d="M12 56 C14 40 10 28 18 12 M24 56 C22 40 26 28 22 12 M36 56 C38 40 34 28 42 12 M48 56 C46 40 50 28 46 12" /><path d="M10 34 C20 30 28 38 38 32 C46 28 52 34 56 30" /><path d="M14 22 L10 20 M26 44 L30 42 M40 20 L44 18" /></>,
  // Withered leaf.
  "matron-wither-curse": <><path d="M32 58 C14 50 8 30 20 12 C36 18 52 32 32 58 Z" /><path d="M32 58 C30 40 28 28 20 12" /><path d="M26 34 H38 M28 44 H36" /></>,
  // Coin with a face.
  "grave-king-soul-tithe": <><circle cx="32" cy="32" r="22" /><circle cx="32" cy="32" r="14" /><path d="M26 28 H28 M36 28 H38 M28 40 H36" /></>,
  // Hell gate arches.
  "grave-king-pit-gate": <><path d="M10 58 V28 C10 8 54 8 54 28 V58" /><path d="M20 58 V30 C20 18 44 18 44 30 V58" /><path d="M32 18 V58" /></>,
  // Scythe with rising souls.
  "grave-king-harvest": <><path d="M10 14 C28 6 48 14 54 32 C42 22 26 20 10 14" /><path d="M12 14 L40 58" /><path d="M48 44 C50 48 50 52 48 54 M54 40 C56 44 56 46 54 48" /></>,
  // Three claw marks.
  "void-titan-burning-mark": <><path d="M14 10 C20 24 20 40 12 56 M28 8 C34 24 34 40 26 58 M42 10 C48 24 48 40 40 56" /><path d="M50 50 C54 46 54 40 50 36" /></>,
  // Waves of flame.
  "void-titan-inferno": <><path d="M6 44 C14 32 20 52 30 38 C38 26 44 50 58 36" /><path d="M6 28 C14 16 20 36 30 22 C38 10 44 34 58 20" /><path d="M6 58 H58" /></>,
  // Dragon head sigil.
  "void-titan-flame-legion": <><path d="M12 40 C12 24 24 12 32 12 C40 12 52 24 52 40 L44 34 L38 46 L32 38 L26 46 L20 34 Z" /><path d="M26 26 L30 30 M38 26 L34 30" /></>,
};
