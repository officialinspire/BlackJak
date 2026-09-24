import introVideoUrl from '../../inspiresoftwareintro.mp4';
import logoUrl from '../../logo.png';

export type StartupState = 'AWAITING_INPUT' | 'INTRO' | 'GAME';

export type StartupEvent = 'start' | 'skip' | 'ended' | 'failed';

export function nextStartupState(state: StartupState, event: StartupEvent): StartupState {
  if (state === 'AWAITING_INPUT' && event === 'start') return 'INTRO';
  if (state === 'INTRO' && (event === 'skip' || event === 'ended' || event === 'failed')) return 'GAME';
  return state;
}

export function startupEventForKey(state: StartupState, key: string): StartupEvent | null {
  if (state === 'AWAITING_INPUT' && (key === 'Enter' || key === ' ')) return 'start';
  if (state === 'INTRO' && (key === 'Enter' || key === 'Escape')) return 'skip';
  return null;
}

/** An intro that has not started (or has stalled) this long is skipped. */
export const INTRO_STALL_TIMEOUT_MS = 8000;

export type StartupUnlockHook = () => void | Promise<void>;

/** Extension point for future media unlock work that must happen inside the first gesture. */
export const unlockStartupMedia: StartupUnlockHook = () => undefined;

interface StartupOptions {
  root: HTMLElement;
  unlockAudio: StartupUnlockHook;
  unlockMedia?: StartupUnlockHook;
  onGameReady: () => void;
}

export class StartupController {
  private state: StartupState = 'AWAITING_INPUT';
  private readonly unlockMedia: StartupUnlockHook;
  private finished = false;
  private stallTimer: ReturnType<typeof setTimeout> | null = null;
  private introVideo: HTMLVideoElement | null = null;

  constructor(private readonly options: StartupOptions) {
    this.unlockMedia = options.unlockMedia ?? unlockStartupMedia;
  }

  mount(): void {
    this.renderAwaitingInput();
  }

  getState(): StartupState {
    return this.state;
  }

  dispatch(event: StartupEvent): void {
    const next = nextStartupState(this.state, event);
    if (next === this.state) return;
    this.state = next;

    if (next === 'INTRO') {
      // Keep unlock and play calls in the user-activation task; rejections must not
      // prevent the app from reaching its menu.
      this.safelyUnlock(this.options.unlockAudio);
      this.safelyUnlock(this.unlockMedia);
      this.renderIntro();
    } else if (next === 'GAME') {
      this.finish();
    }
  }

  private safelyUnlock(hook: StartupUnlockHook): void {
    try {
      const result = hook();
      if (result instanceof Promise) void result.catch(() => undefined);
    } catch {
      // Unlock support is best-effort and must never strand the player.
    }
  }

  private renderAwaitingInput(): void {
    this.options.root.innerHTML = `
      <main id="app-main" class="startup startup-awaiting" tabindex="-1" aria-labelledby="startup-title">
        <div class="startup-lockup">
          <img class="startup-logo" src="${logoUrl}" alt="INSPIRE" />
          <p class="startup-presents">INSPIRE presents</p>
          <h1 id="startup-title">BLACKJAK</h1>
          <button class="startup-action" type="button">TAP / CLICK / PRESS ENTER TO START</button>
        </div>
      </main>`;

    const main = this.options.root.querySelector<HTMLElement>('.startup-awaiting');
    const button = this.options.root.querySelector<HTMLButtonElement>('.startup-action');
    const start = () => this.dispatch('start');
    button?.addEventListener('click', start, { once: true });
    main?.addEventListener('click', start, { once: true });
    document.addEventListener('keydown', this.onKeyDown);
    button?.focus({ preventScroll: true });
  }

  private renderIntro(): void {
    this.options.root.innerHTML = `
      <main id="app-main" class="startup startup-intro" tabindex="-1" aria-label="INSPIRE introduction">
        <video class="startup-video" src="${introVideoUrl}" playsinline preload="auto" aria-label="INSPIRE introduction video"></video>
        <button class="startup-skip" type="button">Skip intro</button>
      </main>`;

    const video = this.options.root.querySelector<HTMLVideoElement>('.startup-video');
    const skip = this.options.root.querySelector<HTMLButtonElement>('.startup-skip');
    skip?.addEventListener('click', () => this.dispatch('skip'), { once: true });
    video?.addEventListener('ended', () => this.dispatch('ended'), { once: true });
    video?.addEventListener('error', () => this.dispatch('failed'), { once: true });

    if (!video) {
      this.dispatch('failed');
      return;
    }

    // A slow or unreachable video (offline before it was cached, flaky network)
    // must not hold the player on a black screen: skip once it stalls too long.
    this.introVideo = video;
    video.addEventListener('playing', () => this.clearStallTimer());
    video.addEventListener('waiting', () => this.armStallTimer());
    this.armStallTimer();
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    try {
      const playback = video.play();
      if (playback) void playback.catch(() => this.dispatch('failed'));
    } catch {
      this.dispatch('failed');
    }
  }

  private armStallTimer(): void {
    this.clearStallTimer();
    this.stallTimer = setTimeout(() => this.dispatch('failed'), INTRO_STALL_TIMEOUT_MS);
  }

  private clearStallTimer(): void {
    if (this.stallTimer !== null) clearTimeout(this.stallTimer);
    this.stallTimer = null;
  }

  /** Mobile browsers pause video in a background tab; resume it on return. */
  private readonly onVisibilityChange = (): void => {
    const video = this.introVideo;
    if (this.state !== 'INTRO' || !video || document.visibilityState === 'hidden') return;
    if (!video.paused || video.ended) return;
    try {
      const playback = video.play();
      if (playback) void playback.catch(() => this.dispatch('failed'));
    } catch {
      this.dispatch('failed');
    }
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const startupEvent = startupEventForKey(this.state, event.key);
    if (!startupEvent) return;
    event.preventDefault();
    this.dispatch(startupEvent);
  };

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.clearStallTimer();
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    // Stop the intro's audio before the menu music starts: no overlap.
    this.introVideo?.pause();
    this.introVideo = null;
    this.options.root.innerHTML = '';
    this.options.onGameReady();
  }
}
