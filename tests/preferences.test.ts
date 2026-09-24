import { afterEach, describe, expect, it } from 'vitest';
import {
  defaultFeedbackPreferences,
  loadFeedbackPreferences,
  saveFeedbackPreferences,
} from '../src/storage/preferences';
import { storage } from '../src/storage/storage';

const originalWindow = globalThis.window;

afterEach(() => {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
});

describe('feedback preferences', () => {
  it('uses safe defaults and persists toggles/volume', () => {
    const values = new Map<string, string>();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => values.get(key) ?? null,
          setItem: (key: string, value: string) => values.set(key, value),
          removeItem: (key: string) => values.delete(key),
        },
      },
    });

    expect(loadFeedbackPreferences()).toEqual(defaultFeedbackPreferences());

    saveFeedbackPreferences({
      master: false,
      music: false,
      sfx: true,
      haptics: false,
      volume: 0.4,
    });

    expect(loadFeedbackPreferences()).toMatchObject({
      master: false,
      music: false,
      haptics: false,
      volume: 0.4,
    });
  });

  it('migrates existing saves with music enabled by default', () => {
    const values = new Map<string, string>();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => values.get(key) ?? null,
          setItem: (key: string, value: string) => values.set(key, value),
          removeItem: (key: string) => values.delete(key),
        },
      },
    });

    storage.set('feedback-preferences', { master: true, sfx: false, haptics: true, volume: 0.3 });

    expect(loadFeedbackPreferences()).toMatchObject({ music: true, sfx: false, volume: 0.3 });
  });

  it('clamps stored volume to the supported 0–1 range', () => {
    const values = new Map<string, string>();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => values.get(key) ?? null,
          setItem: (key: string, value: string) => values.set(key, value),
          removeItem: (key: string) => values.delete(key),
        },
      },
    });

    saveFeedbackPreferences({ ...defaultFeedbackPreferences(), volume: 2 });
    expect(loadFeedbackPreferences().volume).toBe(1);
  });
});
