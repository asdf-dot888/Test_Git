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

class FakeAudioParam {
  value = 0;
  setValueAtTime(value: number): void { this.value = value; }
  linearRampToValueAtTime(value: number): void { this.value = value; }
  exponentialRampToValueAtTime(value: number): void { this.value = value; }
}

class FakeGainNode {
  gain = new FakeAudioParam();
  connect(): void {}
  disconnect(): void {}
}

class FakeOscillatorNode {
  type = "sine";
  frequency = new FakeAudioParam();
  onended: (() => void) | null = null;
  starts: number[] = [];
  stops: number[] = [];
  connect(): void {}
  disconnect(): void {}
  start(at: number): void { this.starts.push(at); }
  stop(at: number): void { this.stops.push(at); }
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  currentTime = 0;
  state: AudioContextState = "running";
  destination = {} as AudioDestinationNode;
  oscillators: FakeOscillatorNode[] = [];
  gains: FakeGainNode[] = [];
  close = vi.fn(async () => undefined);
  resume = vi.fn(async () => undefined);

  constructor() { FakeAudioContext.instances.push(this); }
  createGain(): FakeGainNode {
    const gain = new FakeGainNode();
    this.gains.push(gain);
    return gain;
  }
  createOscillator(): FakeOscillatorNode {
    const oscillator = new FakeOscillatorNode();
    this.oscillators.push(oscillator);
    return oscillator;
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
  it("loops menu music and does not restart the same track", async () => {
    const { controller, players } = setup();
    controller.playMusic("menu");
    await Promise.resolve();
    const music = players[0]!;
    music.currentTime = 7;
    controller.playMusic("menu");

    expect(music.src).toBe("/audio/bgm/menu.wav");
    expect(music.loop).toBe(true);
    expect(music.playCount).toBe(1);
    expect(music.currentTime).toBe(7);
    controller.dispose();
  });

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
    controller.playEffect("impact-light");
    controller.playEffect("impact-medium");
    controller.playEffect("impact-heavy");
    controller.playEffect("impact-armor-block");
    controller.playEffect("impact-hero-melee");
    controller.playEffect("impact-boss-area");

    expect(players.map((player) => player.src)).toEqual([
      "/audio/sfx/attack.ogg",
      "/audio/sfx/attack.ogg",
      "/audio/sfx/attack.ogg",
      "/audio/sfx/spell.ogg",
      "/audio/sfx/heal.ogg",
      "/audio/sfx/damage.ogg",
      "/audio/sfx/death.ogg",
      "/audio/sfx/impact-light.ogg",
      "/audio/sfx/impact-medium.ogg",
      "/audio/sfx/impact-heavy.ogg",
      "/audio/sfx/impact-armor-block.ogg",
      "/audio/sfx/impact-hero-melee.ogg",
      "/audio/sfx/impact-boss-area.ogg",
    ]);
    expect(players.every((player) => player.volume === 0.72)).toBe(true);
    expect(players.every((player) => !player.paused)).toBe(true);
    controller.dispose();
    expect(players.every((player) => player.paused)).toBe(true);
  });

  it("plays interaction cues from local assets and preserves per-effect volume scales", () => {
    const { controller, players } = setup();
    controller.playEffect("ui-click");
    controller.playEffect("turn-start");
    controller.playEffect("turn-end");
    controller.playEffect("summon");
    controller.playEffect("timer-warning", 0.4);

    expect(players.map((player) => player.src)).toEqual([
      "/audio/sfx/ui-click.ogg",
      "/audio/sfx/attack.ogg",
      "/audio/sfx/spell.ogg",
      "/audio/sfx/timer-warning.ogg",
    ]);
    expect(players.map((player) => player.volume)).toEqual([0.72, 0.72, 0.72, 0.288]);

    controller.setSettings({ musicVolume: 0.5, effectsVolume: 0.5, muted: false });
    expect(players.map((player) => player.volume)).toEqual([0.5, 0.5, 0.5, 0.2]);
    controller.setSettings({ musicVolume: 0.5, effectsVolume: 0.5, muted: true });
    expect(players.every((player) => player.volume === 0)).toBe(true);
    controller.setSettings({ musicVolume: 0.5, effectsVolume: 0.5, muted: false });
    expect(players[3]?.volume).toBe(0.2);
    controller.playEffect("timer-warning", 4);
    expect(players[4]?.volume).toBe(0.5);
    controller.dispose();
  });

  it("plays a distinct synthesized rising two-note turn cue and applies effects volume and mute", () => {
    FakeAudioContext.instances = [];
    vi.stubGlobal("AudioContext", FakeAudioContext);
    const { controller, players } = setup();
    controller.setSettings({ musicVolume: 0.4, effectsVolume: 0.6, muted: false });
    controller.playEffect("turn-start");

    const context = FakeAudioContext.instances[0]!;
    expect(players).toHaveLength(0);
    expect(context.oscillators).toHaveLength(2);
    expect(context.oscillators.map((oscillator) => oscillator.frequency.value)).toEqual([587.33, 783.99]);
    expect(context.oscillators.every((oscillator) => oscillator.type === "triangle")).toBe(true);
    expect(context.gains[0]?.gain.value).toBeCloseTo(0.21);

    controller.setSettings({ musicVolume: 0.4, effectsVolume: 0.6, muted: true });
    expect(context.gains[0]?.gain.value).toBe(0);
    controller.dispose();
    expect(context.close).toHaveBeenCalledOnce();
  });

  it("does not fail when WebAudio is unavailable or turn effects are muted", () => {
    vi.stubGlobal("AudioContext", undefined);
    const { controller, players } = setup();
    expect(() => controller.playEffect("turn-start")).not.toThrow();
    expect(players).toHaveLength(0);
    controller.dispose();

    vi.stubGlobal("AudioContext", FakeAudioContext);
    FakeAudioContext.instances = [];
    const muted = setup().controller;
    muted.setSettings({ musicVolume: 0.4, effectsVolume: 1, muted: true });
    muted.playEffect("turn-start");
    expect(FakeAudioContext.instances).toHaveLength(0);
    muted.dispose();
  });

  it("clamps volumes, applies mute, and retries blocked music after unlock", async () => {
    const players: FakeAudio[] = [];
    const controller = createAudioController((src) => {
      const player = new FakeAudio(src);
      if (src === "/audio/bgm/normal.ogg") player.rejectPlayback = true;
      players.push(player);
      return player as unknown as HTMLAudioElement;
    });
    expect(await controller.playMusic("normal")).toBe(false);
    const music = players[0]!;
    await Promise.resolve();
    music.rejectPlayback = false;
    expect(await controller.unlock()).toBe(true);
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
