import { afterEach, describe, expect, it, vi } from "vitest";
import { createAudioController } from "./audio.js";
import { __setSoundRecipesForTest, type SoundRecipe } from "./soundRecipes.js";

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
  target: unknown = null;
  connect(target?: unknown): void { this.target = target; }
  disconnect = vi.fn();
}

class FakeBiquadFilterNode {
  type = "lowpass";
  frequency = new FakeAudioParam();
  Q = new FakeAudioParam();
  connect(): void {}
  disconnect = vi.fn();
}

class FakeBufferSourceNode {
  buffer: unknown = null;
  loop = false;
  onended: (() => void) | null = null;
  starts: number[] = [];
  stops: Array<number | undefined> = [];
  connect(): void {}
  disconnect = vi.fn();
  start(at: number): void { this.starts.push(at); }
  stop(at?: number): void { this.stops.push(at); }
}

class FakeOscillatorNode {
  type = "sine";
  frequency = new FakeAudioParam();
  detune = new FakeAudioParam();
  onended: (() => void) | null = null;
  starts: number[] = [];
  stops: Array<number | undefined> = [];
  connect(): void {}
  disconnect = vi.fn();
  start(at: number): void { this.starts.push(at); }
  stop(at?: number): void { this.stops.push(at); }
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  currentTime = 0;
  state: AudioContextState = "running";
  destination = {} as AudioDestinationNode;
  sampleRate = 8000;
  oscillators: FakeOscillatorNode[] = [];
  bufferSources: FakeBufferSourceNode[] = [];
  filters: FakeBiquadFilterNode[] = [];
  buffersCreated = 0;
  gains: FakeGainNode[] = [];
  /** Gain nodes connected straight to the destination (the masters), in creation order. */
  get masterGains(): FakeGainNode[] { return this.gains.filter((gain) => gain.target === this.destination); }
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
  createBiquadFilter(): FakeBiquadFilterNode {
    const filter = new FakeBiquadFilterNode();
    this.filters.push(filter);
    return filter;
  }
  createBufferSource(): FakeBufferSourceNode {
    const source = new FakeBufferSourceNode();
    this.bufferSources.push(source);
    return source;
  }
  createBuffer(_channels: number, length: number): { getChannelData(): Float32Array } {
    this.buffersCreated += 1;
    return { getChannelData: () => new Float32Array(length) };
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

  it("synthesizes a short band-passed noise rustle for hover and cleans its nodes after playback", () => {
    FakeAudioContext.instances = [];
    vi.stubGlobal("AudioContext", FakeAudioContext);
    const { controller, players } = setup();
    controller.playEffect("ui-hover");

    const context = FakeAudioContext.instances[0]!;
    expect(players).toHaveLength(0);
    // No tonal oscillators: one noise source through one band-pass filter.
    expect(context.oscillators).toHaveLength(0);
    expect(context.bufferSources).toHaveLength(1);
    expect(context.filters).toHaveLength(1);
    expect(context.filters[0]?.type).toBe("bandpass");
    const source = context.bufferSources[0]!;
    expect(source.starts).toHaveLength(1);
    expect(source.stops[0]).toBeLessThan(0.15);
    expect(context.masterGains[0]?.gain.value).toBeCloseTo(0.72 * 0.12);
    source.onended?.();
    expect(source.disconnect).toHaveBeenCalledOnce();
    expect(context.filters[0]?.disconnect).toHaveBeenCalledOnce();
    expect(context.masterGains[0]?.disconnect).toHaveBeenCalledOnce();
    controller.dispose();
  });

  it("plays the two taunt cues as synthesized layers without audio files and honors mute", () => {
    FakeAudioContext.instances = [];
    vi.stubGlobal("AudioContext", FakeAudioContext);
    const { controller, players } = setup();
    controller.playEffect("taunt-summon");
    controller.playEffect("taunt-blocked");
    const context = FakeAudioContext.instances[0]!;
    expect(players).toHaveLength(0);
    expect(context.oscillators.length).toBeGreaterThanOrEqual(4);
    controller.setSettings({ musicVolume: 0.4, effectsVolume: 1, muted: true });
    const before = context.oscillators.length;
    controller.playEffect("taunt-blocked");
    expect(context.oscillators).toHaveLength(before);
    controller.dispose();
  });

  it("honors mute and effect volume, rate-limits hover only, and clears active nodes on dispose", async () => {
    vi.useFakeTimers();
    FakeAudioContext.instances = [];
    vi.stubGlobal("AudioContext", FakeAudioContext);
    const { controller, players } = setup();
    controller.setSettings({ musicVolume: 0.4, effectsVolume: 1, muted: true });
    controller.playEffect("ui-hover");
    expect(FakeAudioContext.instances).toHaveLength(0);

    controller.setSettings({ musicVolume: 0.4, effectsVolume: 0, muted: false });
    controller.playEffect("ui-hover");
    expect(FakeAudioContext.instances).toHaveLength(0);

    controller.setSettings({ musicVolume: 0.4, effectsVolume: 1, muted: false });
    controller.playEffect("ui-hover");
    controller.playEffect("ui-hover");
    expect(FakeAudioContext.instances[0]?.bufferSources).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(120);
    controller.playEffect("ui-hover");
    expect(FakeAudioContext.instances[0]?.bufferSources).toHaveLength(2);

    controller.playEffect("ui-click");
    expect(players).toHaveLength(1);
    expect(players[0]?.src).toBe("/audio/sfx/ui-click.ogg");
    const context = FakeAudioContext.instances[0]!;
    controller.dispose();
    expect(context.bufferSources.every((source) => source.stops.length > 0)).toBe(true);
    expect(context.close).toHaveBeenCalledOnce();
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

  it("requests blocked music playback synchronously during the first gesture", async () => {
    FakeAudioContext.instances = [];
    vi.stubGlobal("AudioContext", FakeAudioContext);
    const players: FakeAudio[] = [];
    const controller = createAudioController((src) => {
      const player = new FakeAudio(src);
      if (src === "/audio/bgm/menu.wav") player.rejectPlayback = true;
      players.push(player);
      return player as unknown as HTMLAudioElement;
    });
    expect(await controller.playMusic("menu")).toBe(false);
    const music = players[0]!;
    controller.playEffect("turn-start");
    const context = FakeAudioContext.instances[0]!;
    context.state = "suspended";
    music.rejectPlayback = false;

    const unlock = controller.unlock();
    expect(context.resume).toHaveBeenCalledOnce();
    expect(music.playCount).toBe(2);
    await expect(unlock).resolves.toBe(true);
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

describe("playSpellCue (synthesized spell sound layer)", () => {
  const recipe: SoundRecipe = {
    id: "test-cue",
    totalMs: 900,
    layers: [
      { wave: "sawtooth", startMs: 0, durationMs: 400, fromHz: 880, toHz: 220, gain: 0.4, detuneCents: 7, filter: { type: "lowpass", fromHz: 4000, toHz: 600, q: 2 } },
      { wave: "noise", startMs: 100, durationMs: 300, fromHz: 1, gain: 0.3, filter: { type: "bandpass", fromHz: 1200 } },
      { wave: "sine", startMs: 500, durationMs: 400, fromHz: 440, gain: 0.5, attackMs: 5 },
    ],
  };

  function setupSynth(settings = { musicVolume: 0.4, effectsVolume: 0.6, muted: false }) {
    FakeAudioContext.instances = [];
    vi.stubGlobal("AudioContext", FakeAudioContext);
    __setSoundRecipesForTest({ "test-cue": recipe });
    const made = setup();
    made.controller.setSettings(settings);
    return made;
  }

  afterEach(() => {
    __setSoundRecipesForTest(null);
    vi.unstubAllGlobals();
  });

  it("builds one oscillator or noise source per layer, schedules each at its offset, and applies the filters", () => {
    const { controller, players } = setupSynth();
    controller.playSpellCue("test-cue");

    const context = FakeAudioContext.instances[0]!;
    expect(players).toHaveLength(0);
    expect(context.oscillators).toHaveLength(2);
    expect(context.bufferSources).toHaveLength(1);
    expect(context.filters).toHaveLength(2);
    expect(context.buffersCreated).toBe(1);

    const [saw, sine] = context.oscillators;
    expect(saw?.type).toBe("sawtooth");
    expect(saw?.frequency.value).toBe(220);
    expect(saw?.detune.value).toBe(7);
    expect(saw?.starts[0]).toBeCloseTo(0);
    expect(saw?.stops[0]).toBeCloseTo(0.42);
    expect(sine?.type).toBe("sine");
    expect(sine?.starts[0]).toBeCloseTo(0.5);
    expect(sine?.stops[0]).toBeCloseTo(0.92);

    const noise = context.bufferSources[0]!;
    expect(noise.loop).toBe(true);
    expect(noise.buffer).not.toBeNull();
    expect(noise.starts[0]).toBeCloseTo(0.1);
    expect(context.filters.map((filter) => filter.type)).toEqual(["lowpass", "bandpass"]);
    expect(context.filters[0]?.frequency.value).toBe(600);
    expect(context.filters[0]?.Q.value).toBe(2);
    controller.dispose();
  });

  it("reuses one noise buffer across cues", () => {
    const { controller } = setupSynth();
    controller.playSpellCue("test-cue");
    controller.playSpellCue("test-cue");
    expect(FakeAudioContext.instances[0]?.buffersCreated).toBe(1);
    controller.dispose();
  });

  it("scales the master volume by the effects volume and the per-cue scale", () => {
    const { controller } = setupSynth();
    controller.playSpellCue("test-cue");
    controller.playSpellCue("test-cue", 0.5);
    const context = FakeAudioContext.instances[0]!;
    const masters = context.gains.filter((gain) => context.masterGains.includes(gain));
    expect(masters).toHaveLength(2);
    expect(masters[0]?.gain.value).toBeCloseTo(0.6 * 0.5);
    expect(masters[1]?.gain.value).toBeCloseTo(0.6 * 0.5 * 0.5);
    controller.dispose();
  });

  it("is silent for unknown ids, muted audio, zero volume, or missing WebAudio", () => {
    const { controller } = setupSynth();
    controller.playSpellCue("not-a-recipe");
    expect(FakeAudioContext.instances).toHaveLength(0);

    controller.setSettings({ musicVolume: 0.4, effectsVolume: 1, muted: true });
    controller.playSpellCue("test-cue");
    expect(FakeAudioContext.instances).toHaveLength(0);

    controller.setSettings({ musicVolume: 0.4, effectsVolume: 0, muted: false });
    controller.playSpellCue("test-cue");
    expect(FakeAudioContext.instances).toHaveLength(0);
    controller.dispose();

    vi.stubGlobal("AudioContext", undefined);
    const noAudio = setup().controller;
    expect(() => noAudio.playSpellCue("test-cue")).not.toThrow();
    noAudio.dispose();
  });

  it("follows live volume and mute changes while a cue is playing", () => {
    const { controller } = setupSynth();
    controller.playSpellCue("test-cue");
    const context = FakeAudioContext.instances[0]!;
    const master = context.masterGains[0]!;
    expect(master.gain.value).toBeCloseTo(0.3);
    controller.setSettings({ musicVolume: 0.4, effectsVolume: 1, muted: false });
    expect(master.gain.value).toBeCloseTo(0.5);
    controller.setSettings({ musicVolume: 0.4, effectsVolume: 1, muted: true });
    expect(master.gain.value).toBe(0);
    controller.dispose();
  });

  it("disconnects every node after the last source ends", () => {
    const { controller } = setupSynth();
    controller.playSpellCue("test-cue");
    const context = FakeAudioContext.instances[0]!;
    const sources = [...context.oscillators, ...context.bufferSources];
    sources.slice(0, -1).forEach((source) => source.onended?.());
    expect(context.masterGains[0]?.disconnect).not.toHaveBeenCalled();
    sources.at(-1)?.onended?.();
    expect(context.masterGains[0]?.disconnect).toHaveBeenCalledOnce();
    expect(context.filters.every((filter) => filter.disconnect.mock.calls.length === 1)).toBe(true);
    for (const source of sources) expect(source.disconnect).toHaveBeenCalled();
    controller.dispose();
  });

  it("allows four concurrent cues and stops the oldest when a fifth starts", () => {
    const { controller } = setupSynth();
    for (let count = 0; count < 4; count += 1) controller.playSpellCue("test-cue");
    const context = FakeAudioContext.instances[0]!;
    expect(context.oscillators.every((oscillator) => oscillator.stops.length === 1)).toBe(true);
    controller.playSpellCue("test-cue");
    // The first cue owns oscillators[0..1] and is stopped immediately; the others keep only their scheduled stop.
    expect(context.oscillators[0]?.stops).toHaveLength(2);
    expect(context.oscillators[1]?.stops).toHaveLength(2);
    expect(context.masterGains[0]?.disconnect).toHaveBeenCalled();
    expect(context.oscillators[2]?.stops).toHaveLength(1);
    expect(context.masterGains[1]?.disconnect).not.toHaveBeenCalled();
    controller.dispose();
  });

  it("stops and disconnects active cues on dispose", () => {
    const { controller } = setupSynth();
    controller.playSpellCue("test-cue");
    const context = FakeAudioContext.instances[0]!;
    controller.dispose();
    expect(context.oscillators.every((oscillator) => oscillator.stops.length === 2)).toBe(true);
    expect(context.bufferSources.every((source) => source.stops.length === 2)).toBe(true);
    expect(context.masterGains[0]?.disconnect).toHaveBeenCalled();
    expect(context.close).toHaveBeenCalledOnce();
    expect(() => controller.playSpellCue("test-cue")).not.toThrow();
    expect(FakeAudioContext.instances).toHaveLength(1);
  });
});
