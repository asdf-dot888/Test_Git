// @vitest-environment jsdom
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CARD_BY_ID, createRun } from "@board-game/game-core";
import { GameSessionView } from "./App.js";
import type { LocalRunController } from "./game/useLocalRun.js";

class FakeAudio {
  static gestureUnlocked = false;
  loop = false;
  volume = 1;
  currentTime = 0;
  paused = true;
  onended: (() => void) | null = null;
  playCount = 0;

  constructor(public src: string) {}

  play(): Promise<void> {
    this.playCount += 1;
    if (!FakeAudio.gestureUnlocked) return Promise.reject(new Error("autoplay blocked"));
    this.paused = false;
    return Promise.resolve();
  }

  pause(): void { this.paused = true; }
}

function makeReadySync(): LocalRunController {
  let run = createRun(1);
  for (let seed = 2; seed < 10_000; seed += 1) {
    const candidate = createRun(seed);
    const handSpell = candidate.battle?.hand.find((instance) => {
      const card = CARD_BY_ID.get(instance.cardId);
      return card?.kind === "spell"
        && (card.cost <= 5)
        && !card.spellEffects?.some((effect) =>
          (effect.kind === "damage" && effect.target === "enemyMinion")
          || (effect.kind === "heal" && effect.target === "playerMinion")
          || effect.kind === "buff",
        );
    });
    if (handSpell) {
      run = candidate;
      break;
    }
  }

  return {
    status: "ready",
    etag: null,
    expiresAt: null,
    message: null,
    run,
    loaded: true,
    loadVersion: 1,
    saveRun: vi.fn(async () => undefined),
    createRun: vi.fn(async () => run),
    replaceRun: vi.fn(async () => run),
    deleteRun: vi.fn(async () => undefined),
    reload: vi.fn(async () => undefined),
    retrySave: vi.fn(async () => undefined),
    retry: vi.fn(async () => undefined),
  };
}

function enterActiveEncounter(): void {
  fireEvent.click(screen.getByRole("button", { name: "원정 계속하기" }));
  const activeEncounter = document.querySelector<HTMLButtonElement>(".expedition-roadmap__node-button[aria-current='step']");
  if (!activeEncounter) throw new Error("The current expedition encounter was not available.");
  fireEvent.click(activeEncounter);
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  FakeAudio.gestureUnlocked = false;
  vi.unstubAllGlobals();
});

describe("audio lifecycle under React StrictMode", () => {
  it("unlocks music, plays combat effects, and disposes the active players on unmount", async () => {
    const players: FakeAudio[] = [];
    vi.stubGlobal("Audio", class extends FakeAudio {
      constructor(src: string) {
        super(src);
        players.push(this);
      }
    });
    const sync = makeReadySync();
    const view = render(<StrictMode><GameSessionView sync={sync} /></StrictMode>);

    enterActiveEncounter();
    await screen.findByRole("button", { name: "메뉴" });
    await waitFor(() => expect(players.some((player) => player.src === "/audio/bgm/normal.ogg")).toBe(true));

    const music = players.find((player) => player.src === "/audio/bgm/normal.ogg");
    expect(music).toBeDefined();
    expect(music?.paused).toBe(true);
    FakeAudio.gestureUnlocked = true;
    document.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    await waitFor(() => expect(music?.paused).toBe(false));
    expect(music?.playCount).toBeGreaterThanOrEqual(2);

    const handSpell = sync.run?.battle?.hand.find((instance) => {
      const card = CARD_BY_ID.get(instance.cardId);
      return card?.kind === "spell"
        && (card.cost <= 5)
        && !card.spellEffects?.some((effect) =>
          (effect.kind === "damage" && effect.target === "enemyMinion")
          || (effect.kind === "heal" && effect.target === "playerMinion")
          || effect.kind === "buff",
        );
    });
    const spell = handSpell ? CARD_BY_ID.get(handSpell.cardId) : undefined;
    expect(spell).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(spell!.name) }));
    await waitFor(() => expect(players.some((player) => player.src.startsWith("/audio/sfx/") && !player.paused)).toBe(true));

    view.unmount();
    expect(players.every((player) => player.paused)).toBe(true);
  });
});
