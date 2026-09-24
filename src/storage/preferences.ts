import type { FeedbackPreferences } from '../types/preferences';
import { storage } from './storage';

const PREFERENCES_KEY = 'feedback-preferences';

export const defaultFeedbackPreferences = (): FeedbackPreferences => ({
  master: true,
  music: true,
  sfx: true,
  haptics: true,
  volume: 0.65,
  musicVolume: 0.65,
});

const unitLevel = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : null;

export function loadFeedbackPreferences(): FeedbackPreferences {
  const fallback = defaultFeedbackPreferences();
  const stored = storage.get<Partial<FeedbackPreferences> | null>(PREFERENCES_KEY, null);
  if (!stored) return fallback;

  return {
    master: stored.master !== false,
    music: stored.music !== false,
    sfx: stored.sfx !== false,
    haptics: stored.haptics !== false,
    volume: unitLevel(stored.volume) ?? fallback.volume,
    // Saves from before the separate music slider used one shared volume.
    musicVolume: unitLevel(stored.musicVolume) ?? unitLevel(stored.volume) ?? fallback.musicVolume,
  };
}

export function saveFeedbackPreferences(preferences: FeedbackPreferences): void {
  storage.set(PREFERENCES_KEY, preferences);
}
