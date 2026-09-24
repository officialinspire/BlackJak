import { describe, expect, it } from 'vitest';
import { MusicEngine, musicStateForScreen, type MusicAudio } from '../src/audio/music';
import { defaultFeedbackPreferences } from '../src/storage/preferences';

class FakeAudio implements MusicAudio {
  loop = false;
  muted = false;
  preload = '';
  volume = 0;
  currentTime = 0;
  playCount = 0;
  pauseCount = 0;
  play(): void { this.playCount += 1; }
  pause(): void { this.pauseCount += 1; }
}

function setup() {
  const audios: FakeAudio[] = [];
  let now = 0;
  let nextHandle = 0;
  const callbacks = new Map<number, () => void>();
  const engine = new MusicEngine({
    createAudio: () => {
      const audio = new FakeAudio();
      audios.push(audio);
      return audio;
    },
    scheduler: {
      now: () => now,
      request: (callback) => { const handle = ++nextHandle; callbacks.set(handle, callback); return handle; },
      cancel: (handle) => { callbacks.delete(handle); },
    },
    observeVisibility: false,
  });
  const advance = (milliseconds: number) => {
    now += milliseconds;
    const pending = [...callbacks.values()];
    callbacks.clear();
    pending.forEach((callback) => callback());
  };
  return { engine, audios, advance, callbacks };
}

describe('music engine', () => {
  it('maps menu-like and gameplay screens to their music states', () => {
    expect(musicStateForScreen('menu')).toBe('MENU');
    expect(musicStateForScreen('stats')).toBe('MENU');
    expect(musicStateForScreen('settings')).toBe('MENU');
    for (const screen of ['classic', 'house', 'daily'] as const) expect(musicStateForScreen(screen)).toBe('GAMEPLAY');
  });

  it('unlocks both looping media elements only once and remains silent in intro', () => {
    const { engine, audios } = setup();
    engine.unlock();
    engine.unlock();
    expect(audios.every((audio) => audio.loop && audio.preload === 'auto')).toBe(true);
    expect(audios.map((audio) => audio.playCount)).toEqual([1, 1]);
    expect(engine.snapshot()).toMatchObject({ target: null, unlocked: true });
  });

  it('crossfades between menu and gameplay over 700ms', () => {
    const { engine, audios, advance } = setup();
    const preferences = defaultFeedbackPreferences();
    engine.unlock();
    engine.sync('MENU', preferences);
    advance(700);
    expect(engine.snapshot()).toMatchObject({ target: 'menu', menuVolume: preferences.volume, gameplayVolume: 0 });
    engine.sync('GAMEPLAY', preferences);
    advance(350);
    expect(audios[0].volume).toBeCloseTo(preferences.volume / 2);
    expect(audios[1].volume).toBeCloseTo(preferences.volume / 2);
    advance(350);
    expect(engine.snapshot()).toMatchObject({ target: 'gameplay', menuVolume: 0, gameplayVolume: preferences.volume });
  });

  it('respects master/music mute and applies volume changes to the active track', () => {
    const { engine, advance } = setup();
    engine.unlock();
    engine.sync('MENU', defaultFeedbackPreferences());
    advance(700);
    engine.sync('MENU', { ...defaultFeedbackPreferences(), volume: 0.25 });
    expect(engine.snapshot().menuVolume).toBe(0.25);
    engine.sync('MENU', { ...defaultFeedbackPreferences(), music: false });
    advance(700);
    expect(engine.snapshot()).toMatchObject({ target: null, menuVolume: 0, gameplayVolume: 0 });
  });

  it('cancels stale fades during rapid switching without orphan playback', () => {
    const { engine, audios, advance, callbacks } = setup();
    const preferences = defaultFeedbackPreferences();
    engine.unlock();
    engine.sync('MENU', preferences);
    advance(200);
    engine.sync('GAMEPLAY', preferences);
    engine.sync('MENU', preferences);
    engine.sync('GAMEPLAY', preferences);
    expect(callbacks.size).toBe(1);
    advance(700);
    expect(engine.snapshot()).toMatchObject({ target: 'gameplay', menuVolume: 0, gameplayVolume: preferences.volume });
    expect(audios[0].pauseCount).toBeGreaterThan(0);
  });

  it('pauses while hidden and resumes the current target safely', () => {
    const { engine, audios, advance } = setup();
    engine.unlock();
    engine.sync('GAMEPLAY', defaultFeedbackPreferences());
    advance(700);
    engine.setVisible(false);
    expect(audios.every((audio) => audio.pauseCount > 0)).toBe(true);
    const plays = audios[1].playCount;
    engine.setVisible(true);
    expect(audios[1].playCount).toBe(plays + 1);
  });
});
