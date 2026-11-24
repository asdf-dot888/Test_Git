import { DEFAULT_ATTACK_MS, getSoundRecipe, type SynthLayer } from "./soundRecipes.js";

export type MusicKind = "menu" | "normal" | "boss";
export type SoundEffectKind = "hero-attack" | "minion-attack" | "spell" | "heal" | "damage" | "death" | "ui-click" | "ui-hover" | "turn-start" | "turn-end" | "summon" | "timer-warning"
  | "impact-light" | "impact-medium" | "impact-heavy" | "impact-armor-block" | "impact-hero-melee" | "impact-boss-area"
  | "taunt-summon" | "taunt-blocked";

export interface AudioSettings {
  musicVolume: number;
  effectsVolume: number;
  muted: boolean;
}

export interface AudioController {
  unlock(): Promise<boolean>;
  playMusic(kind: MusicKind): Promise<boolean>;
  playEffect(kind: SoundEffectKind, volumeScale?: number): void;
  /** Plays the synthesized sound layer of a spell or hero power effect (no-op for unknown ids). */
  playSpellCue(id: string, volumeScale?: number): void;
  setSettings(settings: AudioSettings): void;
  dispose(): void;
}

const MUSIC_SOURCES: Record<MusicKind, string> = {
  menu: "/audio/bgm/menu.wav",
  normal: "/audio/bgm/normal.ogg",
  boss: "/audio/bgm/boss.ogg",
};

const EFFECT_SOURCES: Record<Exclude<SoundEffectKind, "turn-start" | "ui-hover" | "taunt-summon" | "taunt-blocked">, string> = {
  "hero-attack": "/audio/sfx/attack.ogg",
  "minion-attack": "/audio/sfx/attack.ogg",
  spell: "/audio/sfx/spell.ogg",
  heal: "/audio/sfx/heal.ogg",
  damage: "/audio/sfx/damage.ogg",
  death: "/audio/sfx/death.ogg",
  "ui-click": "/audio/sfx/ui-click.ogg",
  "turn-end": "/audio/sfx/attack.ogg",
  summon: "/audio/sfx/spell.ogg",
  "timer-warning": "/audio/sfx/timer-warning.ogg",
  "impact-light": "/audio/sfx/impact-light.ogg",
  "impact-medium": "/audio/sfx/impact-medium.ogg",
  "impact-heavy": "/audio/sfx/impact-heavy.ogg",
  "impact-armor-block": "/audio/sfx/impact-armor-block.ogg",
  "impact-hero-melee": "/audio/sfx/impact-hero-melee.ogg",
  "impact-boss-area": "/audio/sfx/impact-boss-area.ogg",
};

const MAX_SPELL_CUES = 4;
const SPELL_CUE_VOLUME = 0.5;
// Card rustle used for hover: a short band-passed noise swish. Retune here if it sounds too loud, long or sharp.
const HOVER_CUE_VOLUME = 0.12;
const HOVER_SWISH_SECONDS = 0.1;
const HOVER_ATTACK_SECONDS = 0.008;
const HOVER_PEAK_GAIN = 0.9;
const HOVER_FILTER_START_HZ = 1_800;
const HOVER_FILTER_END_HZ = 4_200;
const HOVER_FILTER_Q = 0.9;
const CROSSFADE_DURATION_MS = 400;
const CROSSFADE_STEP_MS = 20;
const DEFAULT_SETTINGS: AudioSettings = { musicVolume: 0.32, effectsVolume: 0.72, muted: false };

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function createAudioController(createAudio: (src: string) => HTMLAudioElement = (src) => new Audio(src)): AudioController {
  let settings = { ...DEFAULT_SETTINGS };
  let currentMusic: HTMLAudioElement | null = null;
  let currentMusicKind: MusicKind | null = null;
  let musicStarted = false;
  let disposed = false;
  const effectPlayers = new Map<HTMLAudioElement, number>();
  const fadingMusic = new Set<HTMLAudioElement>();
  const timers = new Set<ReturnType<typeof setInterval>>();
  let audioContext: AudioContext | null = null;
  const turnCues = new Set<{ master: GainNode; oscillators: OscillatorNode[] }>();
  const hoverCues = new Set<{ master: GainNode; sources: AudioScheduledSourceNode[] }>();
  let lastHoverAt = Number.NEGATIVE_INFINITY;
  interface SpellCue { master: GainNode; scale: number; sources: AudioScheduledSourceNode[]; nodes: AudioNode[] }
  const spellCues: SpellCue[] = [];
  let noiseBuffer: AudioBuffer | null = null;

  function getAudioContext(): AudioContext | null {
    if (audioContext || typeof globalThis.AudioContext === "undefined") return audioContext;
    try {
      audioContext = new globalThis.AudioContext();
      return audioContext;
    } catch {
      return null;
    }
  }

  function playTurnStartCue(): void {
    if (disposed || effectVolume(0.35) === 0) return;
    const context = getAudioContext();
    if (!context) return;
    try {
      const master = context.createGain();
      master.gain.setValueAtTime(effectVolume(0.35), context.currentTime);
      master.connect(context.destination);
      const cue = { master, oscillators: [] as OscillatorNode[] };
      turnCues.add(cue);
      const notes = [
        { frequency: 587.33, start: 0, duration: 0.19 },
        { frequency: 783.99, start: 0.2, duration: 0.24 },
      ];
      for (const note of notes) {
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        const start = context.currentTime + note.start;
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(note.frequency, start);
        envelope.gain.setValueAtTime(0.0001, start);
        envelope.gain.linearRampToValueAtTime(0.55, start + 0.025);
        envelope.gain.exponentialRampToValueAtTime(0.0001, start + note.duration);
        oscillator.connect(envelope);
        envelope.connect(master);
        oscillator.onended = () => {
          oscillator.disconnect();
          envelope.disconnect();
          cue.oscillators = cue.oscillators.filter((active) => active !== oscillator);
          if (cue.oscillators.length === 0) {
            master.disconnect();
            turnCues.delete(cue);
          }
        };
        cue.oscillators.push(oscillator);
        oscillator.start(start);
        oscillator.stop(start + note.duration + 0.01);
      }
    } catch {
      // Audio support is optional; a missing WebAudio implementation must not affect gameplay.
    }
  }

  /** A very short band-passed noise swish, like a card sliding over another ("사락"). Constants are at the top of the file. */
  function playHoverCue(): void {
    const now = Date.now();
    if (disposed || effectVolume(HOVER_CUE_VOLUME) === 0 || now - lastHoverAt < 120) return;
    lastHoverAt = now;
    const context = getAudioContext();
    if (!context) return;
    try {
      const buffer = getNoiseBuffer(context);
      if (!buffer) return;
      const master = context.createGain();
      master.gain.setValueAtTime(effectVolume(HOVER_CUE_VOLUME), context.currentTime);
      master.connect(context.destination);
      const source = context.createBufferSource();
      source.buffer = buffer;
      const filter = context.createBiquadFilter();
      const envelope = context.createGain();
      const start = context.currentTime;
      const end = start + HOVER_SWISH_SECONDS;
      filter.type = "bandpass";
      filter.Q.setValueAtTime(HOVER_FILTER_Q, start);
      filter.frequency.setValueAtTime(HOVER_FILTER_START_HZ, start);
      filter.frequency.exponentialRampToValueAtTime(HOVER_FILTER_END_HZ, end);
      envelope.gain.setValueAtTime(0.0001, start);
      envelope.gain.linearRampToValueAtTime(HOVER_PEAK_GAIN, start + HOVER_ATTACK_SECONDS);
      envelope.gain.exponentialRampToValueAtTime(0.0001, end);
      source.connect(filter);
      filter.connect(envelope);
      envelope.connect(master);
      const cue = { master, sources: [source] as AudioScheduledSourceNode[] };
      hoverCues.add(cue);
      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        envelope.disconnect();
        master.disconnect();
        hoverCues.delete(cue);
      };
      // Start somewhere inside the shared noise buffer so repeated hovers do not sound identical.
      source.start(start, Math.random() * (buffer.duration > HOVER_SWISH_SECONDS * 2 ? buffer.duration - HOVER_SWISH_SECONDS * 2 : 0));
      source.stop(end + 0.01);
    } catch {
      // Audio support is optional; a missing WebAudio implementation must not affect gameplay.
    }
  }

  function getNoiseBuffer(context: AudioContext): AudioBuffer | null {
    if (noiseBuffer) return noiseBuffer;
    try {
      const sampleRate = context.sampleRate || 44_100;
      const buffer = context.createBuffer(1, sampleRate, sampleRate);
      const data = buffer.getChannelData(0);
      let seed = 0x2f6e2b1;
      for (let index = 0; index < data.length; index += 1) {
        seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
        data[index] = seed / 0x80000000 - 1;
      }
      noiseBuffer = buffer;
      return buffer;
    } catch {
      return null;
    }
  }

  function finishSpellCue(cue: SpellCue): void {
    for (const node of cue.nodes) {
      try { node.disconnect(); } catch { /* Node may already be disconnected. */ }
    }
    try { cue.master.disconnect(); } catch { /* Node may already be disconnected. */ }
    const index = spellCues.indexOf(cue);
    if (index >= 0) spellCues.splice(index, 1);
  }

  function stopSpellCue(cue: SpellCue): void {
    for (const source of cue.sources) {
      try { source.stop(); } catch { /* Source may already have stopped. */ }
    }
    cue.sources = [];
    finishSpellCue(cue);
  }

  function addSynthLayer(context: AudioContext, cue: SpellCue, layer: SynthLayer): void {
    const start = context.currentTime + layer.startMs / 1000;
    const end = start + layer.durationMs / 1000;
    const attack = Math.min(layer.durationMs, layer.attackMs ?? DEFAULT_ATTACK_MS) / 1000;
    let source: AudioScheduledSourceNode;
    if (layer.wave === "noise") {
      const buffer = getNoiseBuffer(context);
      if (!buffer) return;
      const noise = context.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      source = noise;
    } else {
      const oscillator = context.createOscillator();
      oscillator.type = layer.wave;
      oscillator.frequency.setValueAtTime(layer.fromHz, start);
      if (layer.toHz !== undefined) oscillator.frequency.exponentialRampToValueAtTime(layer.toHz, end);
      if (layer.detuneCents) oscillator.detune.setValueAtTime(layer.detuneCents, start);
      source = oscillator;
    }
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.linearRampToValueAtTime(layer.gain, start + attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    const nodes: AudioNode[] = [source, envelope];
    if (layer.filter) {
      const filter = context.createBiquadFilter();
      filter.type = layer.filter.type;
      filter.frequency.setValueAtTime(layer.filter.fromHz, start);
      if (layer.filter.toHz !== undefined) filter.frequency.exponentialRampToValueAtTime(layer.filter.toHz, end);
      filter.Q.setValueAtTime(layer.filter.q ?? 0.8, start);
      source.connect(filter);
      filter.connect(envelope);
      nodes.push(filter);
    } else {
      source.connect(envelope);
    }
    envelope.connect(cue.master);
    cue.nodes.push(...nodes);
    cue.sources.push(source);
    source.onended = () => {
      cue.sources = cue.sources.filter((active) => active !== source);
      if (cue.sources.length === 0) finishSpellCue(cue);
    };
    source.start(start);
    source.stop(end + 0.02);
  }

  function playSpellCue(id: string, volumeScale: number): void {
    const recipe = getSoundRecipe(id);
    const scale = clampVolume(volumeScale);
    if (!recipe || disposed || effectVolume(SPELL_CUE_VOLUME * scale) === 0) return;
    const context = getAudioContext();
    if (!context) return;
    try {
      const master = context.createGain();
      master.gain.setValueAtTime(effectVolume(SPELL_CUE_VOLUME * scale), context.currentTime);
      master.connect(context.destination);
      const cue: SpellCue = { master, scale, sources: [], nodes: [] };
      while (spellCues.length >= MAX_SPELL_CUES) stopSpellCue(spellCues[0]!);
      spellCues.push(cue);
      for (const layer of recipe.layers) addSynthLayer(context, cue, layer);
    } catch {
      // Audio support is optional; a missing WebAudio implementation must not affect gameplay.
    }
  }

  const musicVolume = () => settings.muted ? 0 : settings.musicVolume;
  const effectVolume = (scale = 1) => settings.muted ? 0 : clampVolume(settings.effectsVolume * scale);

  function attemptPlay(audio: HTMLAudioElement, isCurrentMusic: boolean): Promise<boolean> {
    try {
      return Promise.resolve(audio.play()).then(() => {
        if (isCurrentMusic && currentMusic === audio) musicStarted = true;
        return !isCurrentMusic || currentMusic === audio;
      }).catch(() => {
        if (isCurrentMusic && currentMusic === audio) musicStarted = false;
        return false;
      });
    } catch {
      if (isCurrentMusic && currentMusic === audio) musicStarted = false;
      return Promise.resolve(false);
    }
  }

  function stopAudio(audio: HTMLAudioElement): void {
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.src = "";
    } catch {
      // Media cleanup must not interfere with gameplay.
    }
  }

  function fadeOut(audio: HTMLAudioElement): void {
    fadingMusic.add(audio);
    const startingVolume = audio.volume;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const progress = Math.min(1, (Date.now() - startedAt) / CROSSFADE_DURATION_MS);
      audio.volume = settings.muted ? 0 : startingVolume * (1 - progress);
      if (progress >= 1) {
        clearInterval(timer);
        timers.delete(timer);
        fadingMusic.delete(audio);
        stopAudio(audio);
      }
    }, CROSSFADE_STEP_MS);
    timers.add(timer);
  }

  function fadeIn(audio: HTMLAudioElement): void {
    const startedAt = Date.now();
    audio.volume = 0;
    const timer = setInterval(() => {
      const progress = Math.min(1, (Date.now() - startedAt) / CROSSFADE_DURATION_MS);
      audio.volume = musicVolume() * progress;
      if (progress >= 1) {
        clearInterval(timer);
        timers.delete(timer);
        if (currentMusic === audio) audio.volume = musicVolume();
      }
    }, CROSSFADE_STEP_MS);
    timers.add(timer);
  }

  return {
    async unlock() {
      if (disposed) return false;
      const context = getAudioContext();
      if (context?.state === "suspended") {
        try { void context.resume().catch(() => undefined); } catch { /* Continue attempting media playback. */ }
      }
      if (!currentMusic) return false;
      if (!musicStarted) return attemptPlay(currentMusic, true);
      return true;
    },

    playMusic(kind) {
      if (disposed) return Promise.resolve(false);
      if (currentMusicKind === kind && currentMusic) {
        if (!musicStarted) {
          currentMusic.volume = musicVolume();
          return attemptPlay(currentMusic, true);
        }
        return Promise.resolve(true);
      }

      let next: HTMLAudioElement;
      try {
        next = createAudio(MUSIC_SOURCES[kind]);
      } catch {
        return Promise.resolve(false);
      }
      const previous = currentMusic;
      currentMusic = next;
      currentMusicKind = kind;
      musicStarted = false;
      next.loop = true;
      next.volume = previous ? 0 : musicVolume();
      const playback = attemptPlay(next, true);
      if (previous) fadeOut(previous);
      if (previous) fadeIn(next);
      return playback;
    },

    playEffect(kind, volumeScale = 1) {
      if (disposed) return;
      if (kind === "turn-start") {
        playTurnStartCue();
        return;
      }
      if (kind === "ui-hover") {
        playHoverCue();
        return;
      }
      if (kind === "taunt-summon" || kind === "taunt-blocked") {
        playSpellCue(kind, volumeScale);
        return;
      }
      const playerScale = clampVolume(volumeScale);
      let player: HTMLAudioElement;
      try {
        player = createAudio(EFFECT_SOURCES[kind]);
      } catch {
        return;
      }
      effectPlayers.set(player, playerScale);
      player.volume = effectVolume(playerScale);
      player.onended = () => {
        effectPlayers.delete(player);
        stopAudio(player);
      };
      void attemptPlay(player, false).finally(() => {
        if (player.paused) {
          effectPlayers.delete(player);
          stopAudio(player);
        }
      });
    },

    playSpellCue(id, volumeScale = 1) {
      playSpellCue(id, volumeScale);
    },

    setSettings(nextSettings) {
      settings = {
        musicVolume: clampVolume(nextSettings.musicVolume),
        effectsVolume: clampVolume(nextSettings.effectsVolume),
        muted: nextSettings.muted,
      };
      if (currentMusic && !fadingMusic.has(currentMusic)) currentMusic.volume = musicVolume();
      for (const [player, scale] of effectPlayers) player.volume = effectVolume(scale);
      for (const cue of turnCues) cue.master.gain.setValueAtTime(effectVolume(0.35), audioContext?.currentTime ?? 0);
      for (const cue of hoverCues) cue.master.gain.setValueAtTime(effectVolume(HOVER_CUE_VOLUME), audioContext?.currentTime ?? 0);
      for (const cue of spellCues) cue.master.gain.setValueAtTime(effectVolume(SPELL_CUE_VOLUME * cue.scale), audioContext?.currentTime ?? 0);
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      for (const timer of timers) clearInterval(timer);
      timers.clear();
      if (currentMusic) stopAudio(currentMusic);
      for (const player of effectPlayers.keys()) stopAudio(player);
      for (const music of fadingMusic) stopAudio(music);
      for (const cue of turnCues) {
        for (const oscillator of cue.oscillators) {
          try { oscillator.stop(); } catch { /* Oscillator may already have stopped. */ }
          oscillator.disconnect();
        }
        cue.master.disconnect();
      }
      turnCues.clear();
      for (const cue of hoverCues) {
        for (const source of cue.sources) {
          try { source.stop(); } catch { /* Source may already have stopped. */ }
          source.disconnect();
        }
        cue.master.disconnect();
      }
      hoverCues.clear();
      for (const cue of [...spellCues]) stopSpellCue(cue);
      spellCues.length = 0;
      noiseBuffer = null;
      if (audioContext) void audioContext.close().catch(() => undefined);
      audioContext = null;
      effectPlayers.clear();
      fadingMusic.clear();
      currentMusic = null;
      currentMusicKind = null;
    },
  };
}
