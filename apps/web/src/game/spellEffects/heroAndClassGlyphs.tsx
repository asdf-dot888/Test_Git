import type { ReactNode } from "react";

/** Unique SVG glyphs (64x64, stroke-based) for hero powers and class spells. */
export const HERO_AND_CLASS_GLYPHS: Readonly<Record<string, ReactNode>> = {
  // Shield with a cross.
  "hero-power-warrior": <><path d="M32 8 L52 16 V32 C52 46 42 54 32 58 C22 54 12 46 12 32 V16 Z" /><path d="M32 8 V58 M12 28 H52" /></>,
  // Two crossed daggers.
  "hero-power-assassin": <><path d="M14 50 L40 14 M40 14 L44 24 M14 50 L24 46" /><path d="M50 50 L24 14 M24 14 L20 24 M50 50 L40 46" /></>,
  // Pentagram inside a ring.
  "hero-power-demonist": <><circle cx="32" cy="34" r="25" /><polygon points="32,10 41,56 9,26 55,26 23,56" /></>,
  // Stacked armor plates.
  "warrior-brace": <><path d="M14 18 H50 L44 32 H20 Z" /><path d="M18 36 H46 L40 50 H24 Z" /></>,
  // War hammer.
  "warrior-hammerfall": <><rect x="14" y="10" width="30" height="16" rx="2" /><path d="M29 26 V56 M20 56 H38" /></>,
  // Banner on a pole.
  "warrior-rally": <><path d="M16 8 V58" /><path d="M16 12 H50 L42 24 L50 36 H16" /></>,
  // Blade with venom drops.
  "assassin-venom-coat": <><path d="M20 54 L40 10 L44 12 L28 56 Z" /><path d="M48 30 C52 36 52 40 48 42 C44 40 44 36 48 30 Z" /><path d="M52 48 C54 51 54 53 52 54 C50 53 50 51 52 48 Z" /></>,
  // Four-point shuriken with a center hole.
  "assassin-shuriken": <><path d="M32 6 L38 26 L58 32 L38 38 L32 58 L26 38 L6 32 L26 26 Z" /><circle cx="32" cy="32" r="4" /></>,
  // Smoke swirl.
  "assassin-smoke-step": <><path d="M10 40 C18 28 30 28 34 36 C38 44 48 42 54 32" /><path d="M14 52 C20 46 28 46 32 50" /><path d="M36 16 C40 12 46 14 46 20 C46 24 42 26 38 24" /></>,
  // Ritual circle with an inverted triangle and candle ticks.
  "demonist-dark-rite": <><circle cx="32" cy="32" r="24" /><path d="M18 22 H46 L32 48 Z" /><path d="M32 6 V12 M32 52 V58" /></>,
  // Flame.
  "demonist-hellfire": <><path d="M32 8 C40 20 50 26 48 40 C46 52 38 58 32 58 C24 58 16 52 16 40 C16 32 22 28 24 20 C28 24 30 24 32 8 Z" /><path d="M32 58 C28 52 28 46 32 40 C36 46 36 52 32 58 Z" /></>,
  // Two linked rings.
  "demonist-soul-bond": <><circle cx="24" cy="32" r="14" /><circle cx="40" cy="32" r="14" /><path d="M32 22 V42" /></>,
};
