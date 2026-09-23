import { afterEach, describe, expect, it } from 'vitest';
import { STORAGE_NAMESPACE, STORAGE_VERSION } from '../src/config/constants';
import { storage } from '../src/storage/storage';

const originalWindow = globalThis.window;
const storageKey = (key: string): string => `${STORAGE_NAMESPACE}:v${STORAGE_VERSION}:${key}`;

afterEach(() => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: originalWindow,
  });
});

function installMemoryStorage(values = new Map<string, string>()): Map<string, string> {
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
  return values;
}

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

  it('falls back when JSON is corrupted', () => {
    const values = installMemoryStorage();
    values.set(storageKey('example'), '{ definitely not valid json');

    expect(storage.get('example', 42)).toBe(42);
  });

  it('falls back for the wrong schema version', () => {
    const values = installMemoryStorage();
    values.set(storageKey('example'), JSON.stringify({ version: STORAGE_VERSION + 1, value: 99 }));

    expect(storage.get('example', 42)).toBe(42);
  });

  it('falls back when an envelope is missing its value', () => {
    const values = installMemoryStorage();
    values.set(storageKey('example'), JSON.stringify({ version: STORAGE_VERSION }));

    expect(storage.get('example', 42)).toBe(42);
  });

  it('round-trips a valid versioned value and removes it safely', () => {
    installMemoryStorage();

    storage.set('example', { count: 7 });
    expect(storage.get('example', { count: 0 })).toEqual({ count: 7 });

    storage.remove('example');
    expect(storage.get('example', { count: 0 })).toEqual({ count: 0 });
  });
});
