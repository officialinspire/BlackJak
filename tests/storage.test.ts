import { afterEach, describe, expect, it } from 'vitest';
import { storage } from '../src/storage/storage';

const originalWindow = globalThis.window;

afterEach(() => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: originalWindow,
  });
});

describe('storage wrapper', () => {
  it('returns fallback when localStorage is unavailable', () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage: {
          getItem: () => { throw new Error('blocked'); },
          setItem: () => { throw new Error('blocked'); },
          removeItem: () => { throw new Error('blocked'); },
        },
      },
    });

    expect(storage.get('example', 42)).toBe(42);
    expect(() => storage.set('example', 7)).not.toThrow();
    expect(() => storage.remove('example')).not.toThrow();
  });
});
