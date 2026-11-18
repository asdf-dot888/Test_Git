import type { ReactNode } from "react";

/** Unique SVG glyphs (64x64, stroke-based) for the shared damage spells. */
export const SHARED_DAMAGE_GLYPHS: Readonly<Record<string, ReactNode>> = {
  // Lightning bolt.
  "shadow-bolt": <path d="M38 6 L18 34 H30 L24 58 L48 26 H34 Z" />,
  // Spear with a ghost ring at its butt.
  "soul-lance": <><path d="M12 52 L50 14" /><path d="M50 14 L36 16 M50 14 L48 28" /><circle cx="19" cy="45" r="6" /></>,
  // Cracked crystal.
  "fate-shard": <><path d="M32 6 L50 24 L40 58 L24 58 L14 24 Z" /><path d="M32 6 V58 M14 24 H50" /></>,
  // Scythe.
  "reaper-cleave": <><path d="M44 8 C20 8 10 24 12 40 C20 28 30 22 44 22" /><path d="M40 20 L26 58" /></>,
  // Meteor with streaking tail.
  "meteor-shard": <><circle cx="42" cy="42" r="12" /><path d="M34 34 L8 8 M38 30 L16 12 M30 38 L12 22" /></>,
  // Spiral with a lightning flash.
  "soul-storm": <><path d="M32 32 C32 28 37 28 37 33 C37 40 27 40 27 32 C27 23 41 23 41 33 C41 45 22 45 22 32 C22 18 46 18 46 33" /><path d="M54 6 L46 18 H54 L48 30" /></>,
  // Black sun with corona rays.
  "eclipse": <><circle cx="32" cy="32" r="13" /><circle cx="32" cy="32" r="22" /><path d="M32 2 V9 M32 55 V62 M2 32 H9 M55 32 H62 M10 10 L15 15 M49 49 L54 54 M54 10 L49 15 M10 54 L15 49" /></>,
};
