export type MusicKind = "normal" | "boss";
export type SoundEffectKind = "hero-attack" | "minion-attack" | "spell" | "heal" | "damage" | "death" | "ui-click" | "turn-start" | "turn-end" | "summon" | "timer-warning";

export interface AudioSettings {
  musicVolume: number;
  effectsVolume: number;
  muted: boolean;
}

export interface AudioController {
  unlock(): Promise<void>;
  playMusic(kind: MusicKind): void;
  playEffect(kind: SoundEffectKind, volumeScale?: number): void;
  setSettings(settings: AudioSettings): void;
  dispose(): void;
}

const MUSIC_SOURCES: Record<MusicKind, string> = {
  normal: "/audio/bgm/normal.ogg",
  boss: "/audio/bgm/boss.ogg",
};

const EFFECT_SOURCES: Record<SoundEffectKind, string> = {
  "hero-attack": "/audio/sfx/attack.ogg",
  "minion-attack": "/audio/sfx/attack.ogg",
  spell: "/audio/sfx/spell.ogg",
  heal: "/audio/sfx/heal.ogg",
  damage: "/audio/sfx/damage.ogg",
  death: "/audio/sfx/death.ogg",
  "ui-click": "/audio/sfx/ui-click.ogg",
  "turn-start": "/audio/sfx/timer-warning.ogg",
  "turn-end": "/audio/sfx/attack.ogg",
  summon: "/audio/sfx/spell.ogg",
  "timer-warning": "/audio/sfx/timer-warning.ogg",
};

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

  const musicVolume = () => settings.muted ? 0 : settings.musicVolume;
  const effectVolume = (scale = 1) => settings.muted ? 0 : clampVolume(settings.effectsVolume * scale);

  function attemptPlay(audio: HTMLAudioElement, isCurrentMusic: boolean): Promise<void> {
    try {
      return Promise.resolve(audio.play()).then(() => {
        if (isCurrentMusic && currentMusic === audio) musicStarted = true;
      }).catch(() => {
        if (isCurrentMusic && currentMusic === audio) musicStarted = false;
      });
    } catch {
      if (isCurrentMusic && currentMusic === audio) musicStarted = false;
      return Promise.resolve();
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
      if (disposed) return;
      if (currentMusic && !musicStarted) await attemptPlay(currentMusic, true);
    },

    playMusic(kind) {
      if (disposed) return;
      if (currentMusicKind === kind && currentMusic) {
        if (!musicStarted) {
          currentMusic.volume = musicVolume();
          void attemptPlay(currentMusic, true);
        }
        return;
      }

      let next: HTMLAudioElement;
      try {
        next = createAudio(MUSIC_SOURCES[kind]);
      } catch {
        return;
      }
      const previous = currentMusic;
      currentMusic = next;
      currentMusicKind = kind;
      musicStarted = false;
      next.loop = true;
      next.volume = previous ? 0 : musicVolume();
      void attemptPlay(next, true);
      if (previous) fadeOut(previous);
      if (previous) fadeIn(next);
    },

    playEffect(kind, volumeScale = 1) {
      if (disposed) return;
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

    setSettings(nextSettings) {
      settings = {
        musicVolume: clampVolume(nextSettings.musicVolume),
        effectsVolume: clampVolume(nextSettings.effectsVolume),
        muted: nextSettings.muted,
      };
      if (currentMusic && !fadingMusic.has(currentMusic)) currentMusic.volume = musicVolume();
      for (const [player, scale] of effectPlayers) player.volume = effectVolume(scale);
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      for (const timer of timers) clearInterval(timer);
      timers.clear();
      if (currentMusic) stopAudio(currentMusic);
      for (const player of effectPlayers.keys()) stopAudio(player);
      for (const music of fadingMusic) stopAudio(music);
      effectPlayers.clear();
      fadingMusic.clear();
      currentMusic = null;
      currentMusicKind = null;
    },
  };
}
