import { STORAGE_NAMESPACE, STORAGE_VERSION } from '../config/constants';

export interface StoredEnvelope<T> {
  version: number;
  value: T;
}

const keyFor = (key: string): string => `${STORAGE_NAMESPACE}:v${STORAGE_VERSION}:${key}`;

export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = window.localStorage.getItem(keyFor(key));
      if (!raw) return fallback;
      const parsed = JSON.parse(raw) as StoredEnvelope<T>;
      if (parsed.version !== STORAGE_VERSION) return fallback;
      return parsed.value;
    } catch {
      return fallback;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      const envelope: StoredEnvelope<T> = { version: STORAGE_VERSION, value };
      window.localStorage.setItem(keyFor(key), JSON.stringify(envelope));
    } catch {
      // Storage can be unavailable in private/restricted browsing. The app remains usable in-memory.
    }
  },

  remove(key: string): void {
    try {
      window.localStorage.removeItem(keyFor(key));
    } catch {
      // Ignore storage failures; storage is an enhancement rather than a hard dependency.
    }
  },
};
