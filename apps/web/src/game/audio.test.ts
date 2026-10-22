import { afterEach, describe, expect, it, vi } from "vitest";
import { createAudioController } from "./audio.js";

class FakeAudio {
  loop = false;
  volume = 1;
  currentTime = 0;
  paused = true;
  onended: (() => void) | null = null;
  playCount = 0;
  pauseCount = 0;
  rejectPlayback = false;

  constructor(public src: string) {}

  play(): Promise<void> {
    this.playCount += 1;
    if (this.rejectPlayback) return Promise.reject(new Error("autoplay blocked"));
    this.paused = false;
    return Promise.resolve();
  }

  pause(): void {
    this.pauseCount += 1;
    this.paused = true;
  }
}

function setup() {
  const players: FakeAudio[] = [];
  const controller = createAudioController((src) => {
    const player = new FakeAudio(src);
    players.push(player);
    return player as unknown as HTMLAudioElement;
  });
  return { controller, players };
}

afterEach(() => vi.useRealTimers());

describe("createAudioController", () => {
  it("loops the selected local theme and does not restart the same track", async () => {
    const { controller, players } = setup();
    controller.playMusic("normal");
    await Promise.resolve();
    players[0]!.currentTime = 12;
    controller.playMusic("normal");

    expect(players[0]?.src).toBe("/audio/bgm/normal.ogg");
    expect(players[0]?.loop).toBe(true);
    expect(players[0]?.playCount).toBe(1);
    expect(players[0]?.currentTime).toBe(12);
    controller.dispose();
  });

  it("crossfades between normal and boss music over about 400ms", async () => {
    vi.useFakeTimers();
    const { controller, players } = setup();
    controller.playMusic("normal");
    await Promise.resolve();
    const normal = players[0]!;

    controller.playMusic("boss");
    const boss = players[1]!;
    expect(boss.src).toBe("/audio/bgm/boss.ogg");
    expect(boss.loop).toBe(true);
    expect(boss.volume).toBe(0);

    await vi.advanceTimersByTimeAsync(200);
    expect(normal.volume).toBeCloseTo(0.16, 1);
    expect(boss.volume).toBeCloseTo(0.16, 1);
    expect(normal.paused).toBe(false);

    await vi.advanceTimersByTimeAsync(200);
    expect(normal.paused).toBe(true);
    expect(boss.volume).toBeCloseTo(0.32, 2);

    controller.playMusic("normal");
    const resumedNormal = players[2]!;
    expect(resumedNormal.src).toBe("/audio/bgm/normal.ogg");
    await vi.advanceTimersByTimeAsync(400);
    expect(boss.paused).toBe(true);
    expect(resumedNormal.volume).toBeCloseTo(0.32, 2);
    controller.dispose();
  });

  it("plays overlapping effects independently and maps each kind to a local file", () => {
    const { controller, players } = setup();
    controller.playEffect("hero-attack");
    controller.playEffect("minion-attack");
    controller.playEffect("minion-attack");
    controller.playEffect("spell");
    controller.playEffect("heal");
    controller.playEffect("damage");
    controller.playEffect("death");

    expect(players.map((player) => player.src)).toEqual([
      "/audio/sfx/attack.ogg",
      "/audio/sfx/attack.ogg",
      "/audio/sfx/attack.ogg",
      "/audio/sfx/spell.ogg",
      "/audio/sfx/heal.ogg",
      "/audio/sfx/damage.ogg",
      "/audio/sfx/death.ogg",
    ]);
    expect(players.every((player) => player.volume === 0.72)).toBe(true);
    expect(players.every((player) => !player.paused)).toBe(true);
    controller.dispose();
    expect(players.every((player) => player.paused)).toBe(true);
  });

  it("clamps volumes, applies mute, and retries blocked music after unlock", async () => {
    const players: FakeAudio[] = [];
    const controller = createAudioController((src) => {
      const player = new FakeAudio(src);
      if (src === "/audio/bgm/normal.ogg") player.rejectPlayback = true;
      players.push(player);
      return player as unknown as HTMLAudioElement;
    });
    controller.playMusic("normal");
    const music = players[0]!;
    await Promise.resolve();
    music.rejectPlayback = false;
    await controller.unlock();
    expect(music.playCount).toBe(2);

    controller.setSettings({ musicVolume: 4, effectsVolume: -1, muted: false });
    expect(music.volume).toBe(1);
    controller.playEffect("spell");
    expect(players[1]?.volume).toBe(0);

    controller.setSettings({ musicVolume: 0.4, effectsVolume: 0.6, muted: true });
    expect(music.volume).toBe(0);
    controller.setSettings({ musicVolume: 0.4, effectsVolume: 0.6, muted: false });
    expect(music.volume).toBe(0.4);
    expect(players[1]?.volume).toBe(0.6);
    controller.dispose();
  });

  it("clears crossfade timers and stops every player on dispose", async () => {
    vi.useFakeTimers();
    const { controller, players } = setup();
    controller.playMusic("normal");
    await Promise.resolve();
    controller.playEffect("damage");
    controller.playMusic("boss");
    controller.dispose();

    expect(vi.getTimerCount()).toBe(0);
    expect(players.every((player) => player.paused)).toBe(true);
    await vi.advanceTimersByTimeAsync(500);
    expect(players.every((player) => player.paused)).toBe(true);
  });
});
