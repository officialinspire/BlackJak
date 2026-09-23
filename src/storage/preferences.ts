import type { FeedbackPreferences } from '../types/preferences';
import { storage } from './storage';

const PREFERENCES_KEY = 'feedback-preferences';

export const defaultFeedbackPreferences = (): FeedbackPreferences => ({
  master: true,
  sfx: true,
  ambience: false,
  haptics: true,
  volume: 0.65,
});

export function loadFeedbackPreferences(): FeedbackPreferences {
  const fallback = defaultFeedbackPreferences();
  const stored = storage.get<Partial<FeedbackPreferences> | null>(PREFERENCES_KEY, null);
  if (!stored) return fallback;

  return {
    master: stored.master !== false,
    sfx: stored.sfx !== false,
    ambience: stored.ambience === true,
    haptics: stored.haptics !== false,
    volume: typeof stored.volume === 'number' && Number.isFinite(stored.volume)
      ? Math.max(0, Math.min(1, stored.volume))
      : fallback.volume,
  };
}

export function saveFeedbackPreferences(preferences: FeedbackPreferences): void {
  storage.set(PREFERENCES_KEY, preferences);
}
