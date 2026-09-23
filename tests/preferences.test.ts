import { afterEach, describe, expect, it } from 'vitest';
import {
  defaultFeedbackPreferences,
  loadFeedbackPreferences,
  saveFeedbackPreferences,
} from '../src/storage/preferences';

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
      sfx: true,
      ambience: true,
      haptics: false,
      volume: 0.4,
    });

    expect(loadFeedbackPreferences()).toMatchObject({
      master: false,
      ambience: true,
      haptics: false,
      volume: 0.4,
    });
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
