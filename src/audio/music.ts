import { MUSIC_ASSETS } from '../assets/media';
import { feedbackEngine } from '../feedback/feedback';
import type { AppScreen } from '../types/app';
import type { FeedbackPreferences } from '../types/preferences';

export type MusicState = 'INTRO' | 'MENU' | 'GAMEPLAY';
export type MusicTrack = keyof typeof MUSIC_ASSETS;

export interface MusicAudio {
  loop: boolean;
  muted: boolean;
  preload: string;
  volume: number;
  currentTime: number;
  play(): Promise<void> | void;
  pause(): void;
}

interface MusicScheduler {
  now(): number;
  request(callback: () => void): number;
  cancel(handle: number): void;
}

interface MusicEngineOptions {
  createAudio?: (source: string) => MusicAudio;
  /** Context for gain-node routing; null keeps element.volume (tests, old browsers). */
  audioContext?: () => AudioContext | null;
  scheduler?: MusicScheduler;
  fadeDuration?: number;
  observeVisibility?: boolean;
}

const browserScheduler: MusicScheduler = {
  now: () => performance.now(),
  request: (callback) => requestAnimationFrame(callback),
  cancel: (handle) => cancelAnimationFrame(handle),
};

function createBrowserAudio(source: string): MusicAudio {
  if (typeof Audio !== 'undefined') return new Audio(source);
  return {
    loop: false,
    muted: false,
    preload: 'none',
    volume: 0,
    currentTime: 0,
    play: () => undefined,
    pause: () => undefined,
  };
}

export function musicStateForScreen(screen: AppScreen): MusicState {
  return screen === 'menu' || screen === 'stats' || screen === 'settings' ? 'MENU' : 'GAMEPLAY';
}

/**
 * iOS Safari ignores HTMLMediaElement.volume (it is always 1), so a volume
 * slider or crossfade written to element.volume does nothing on iPhone/iPad.
 * Routing each track through a Web Audio GainNode makes the level work on
 * every browser; element.volume is only the fallback when routing fails.
 */
interface TrackOutput {
  gain: GainNode | null;
  level: number;
}

export class MusicEngine {
  private readonly tracks: Record<MusicTrack, MusicAudio>;
  private readonly outputs: Record<MusicTrack, TrackOutput> = {
    menu: { gain: null, level: 0 },
    gameplay: { gain: null, level: 0 },
  };
  private readonly audioContext: () => AudioContext | null;
  private context: AudioContext | null = null;
  private readonly scheduler: MusicScheduler;
  private readonly fadeDuration: number;
  private state: MusicState = 'INTRO';
  private preferences: FeedbackPreferences | null = null;
  private unlocked = false;
  private visible = true;
  private frame: number | null = null;
  private transition = 0;

  constructor(options: MusicEngineOptions = {}) {
    const createAudio = options.createAudio ?? createBrowserAudio;
    this.audioContext = options.audioContext ?? (() => (options.createAudio ? null : feedbackEngine.audioContext()));
    this.scheduler = options.scheduler ?? browserScheduler;
    this.fadeDuration = options.fadeDuration ?? 700;
    this.tracks = {
      menu: createAudio(MUSIC_ASSETS.menu),
      gameplay: createAudio(MUSIC_ASSETS.gameplay),
    };
    for (const track of Object.values(this.tracks)) {
      track.loop = true;
      // No download before the player opts in: ~5.7 MB of music must not compete
      // with the core app/art on first load. unlock() switches to 'auto'.
      track.preload = 'none';
      track.volume = 0;
    }

    if (options.observeVisibility !== false && typeof document !== 'undefined') {
      this.visible = document.visibilityState !== 'hidden';
      document.addEventListener('visibilitychange', () => this.setVisible(document.visibilityState !== 'hidden'));
      window.addEventListener('pagehide', () => this.setVisible(false));
      window.addEventListener('pageshow', () => this.setVisible(true));
    }
  }

  /** Prime both HTMLMediaElements synchronously inside the startup gesture. */
  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    this.routeThroughGain();
    for (const track of Object.values(this.tracks)) {
      track.preload = 'auto';
      // Muted for the priming play(); level stays at 0 (gain or element volume).
      track.muted = true;
      try {
        const result = track.play();
        if (result) void result.catch(() => undefined);
        track.pause();
        track.currentTime = 0;
        track.muted = false;
      } catch {
        track.muted = false;
      }
    }
  }

  sync(state: MusicState, preferences: FeedbackPreferences): void {
    const previousState = this.state;
    const previousPreferences = this.preferences;
    this.state = state;
    this.preferences = preferences;
    if (!this.unlocked || !this.visible) return;

    const previousTarget = this.targetFor(previousState, previousPreferences);
    const nextTarget = this.targetFor(state, preferences);
    const sameTarget = previousTarget === nextTarget;
    const sameVolume = previousPreferences?.musicVolume === preferences.musicVolume;

    // render() calls sync after every UI update. A same-target rerender must not
    // restart an in-flight fade (which would repeatedly call play() and make the
    // transition asymptotically slow). Volume changes are the one exception.
    this.resumeContext();
    if (sameTarget && sameVolume) {
      if (this.frame === null && nextTarget) this.setLevel(nextTarget, preferences.musicVolume);
      return;
    }

    if (sameTarget && this.frame === null) {
      if (nextTarget) this.setLevel(nextTarget, preferences.musicVolume);
      return;
    }

    this.crossfade();
  }

  setVisible(visible: boolean): void {
    if (this.visible === visible) return;
    this.visible = visible;
    if (!visible) {
      this.cancelFade();
      for (const track of Object.values(this.tracks)) track.pause();
      return;
    }
    if (this.unlocked && this.preferences) {
      this.resumeContext();
      this.crossfade();
    }
  }

  snapshot(): { target: MusicTrack | null; menuVolume: number; gameplayVolume: number; unlocked: boolean } {
    return {
      target: this.targetFor(this.state, this.preferences),
      menuVolume: this.outputs.menu.level,
      gameplayVolume: this.outputs.gameplay.level,
      unlocked: this.unlocked,
    };
  }

  private targetFor(state: MusicState, preferences: FeedbackPreferences | null): MusicTrack | null {
    if (!preferences || state === 'INTRO' || !preferences.master || !preferences.music || preferences.musicVolume <= 0) return null;
    return state === 'MENU' ? 'menu' : 'gameplay';
  }

  private crossfade(): void {
    this.cancelFade();
    const transition = ++this.transition;
    const target = this.targetFor(this.state, this.preferences);
    const targetVolume = this.preferences?.musicVolume ?? 0;
    const start = this.scheduler.now();
    const from = { menu: this.outputs.menu.level, gameplay: this.outputs.gameplay.level };

    if (target) this.safePlay(this.tracks[target]);
    const step = (): void => {
      if (transition !== this.transition) return;
      const progress = Math.min(1, Math.max(0, (this.scheduler.now() - start) / this.fadeDuration));
      for (const name of ['menu', 'gameplay'] as const) {
        const destination = name === target ? targetVolume : 0;
        this.setLevel(name, from[name] + (destination - from[name]) * progress);
      }
      if (progress < 1) {
        this.frame = this.scheduler.request(step);
      } else {
        this.frame = null;
        for (const name of ['menu', 'gameplay'] as const) if (name !== target) this.tracks[name].pause();
      }
    };
    step();
  }

  private setLevel(name: MusicTrack, level: number): void {
    const output = this.outputs[name];
    output.level = level;
    if (output.gain) output.gain.gain.value = level;
    else this.tracks[name].volume = level;
  }

  /** Must run inside the start gesture: iOS only unlocks Web Audio there. */
  private routeThroughGain(): void {
    let context: AudioContext | null = null;
    try {
      context = this.audioContext();
    } catch {
      context = null;
    }
    if (!context) return;
    for (const name of ['menu', 'gameplay'] as const) {
      const track = this.tracks[name];
      if (typeof HTMLMediaElement === 'undefined' || !(track instanceof HTMLMediaElement)) continue;
      try {
        const gain = context.createGain();
        gain.gain.value = this.outputs[name].level;
        context.createMediaElementSource(track).connect(gain);
        gain.connect(context.destination);
        track.volume = 1;
        this.outputs[name].gain = gain;
        this.context = context;
      } catch {
        // Keep element.volume control for this track.
      }
    }
  }

  /** Routed music is silent while the context is suspended (iOS after backgrounding). */
  private resumeContext(): void {
    const context = this.context;
    if (context && context.state !== 'running' && context.state !== 'closed') {
      void context.resume().catch(() => undefined);
    }
  }

  private safePlay(track: MusicAudio): void {
    try {
      const result = track.play();
      if (result) void result.catch(() => undefined);
    } catch {
      // Playback failure must never block navigation or other feedback.
    }
  }

  private cancelFade(): void {
    this.transition += 1;
    if (this.frame !== null) this.scheduler.cancel(this.frame);
    this.frame = null;
  }
}

export const musicEngine = new MusicEngine();
