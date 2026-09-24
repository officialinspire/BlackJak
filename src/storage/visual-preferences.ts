import { DEFAULT_CARD_THEME, isCardThemeId } from '../data/card-atlas';
import type { VisualPreferences } from '../types/preferences';
import { storage } from './storage';

/*
 * Visual-only preferences (deck theme), stored apart from feedback settings and
 * the profile so no existing save shape changes. Missing, older, or corrupted
 * values migrate to safe defaults; unknown themes fall back to 'standard'.
 */

const VISUAL_PREFERENCES_KEY = 'visual-preferences';
const VISUAL_PREFERENCES_VERSION = 1;

interface StoredVisualPreferences extends VisualPreferences {
  version: number;
}

export const defaultVisualPreferences = (): VisualPreferences => ({ cardTheme: DEFAULT_CARD_THEME });

export function loadVisualPreferences(): VisualPreferences {
  const stored = storage.get<unknown>(VISUAL_PREFERENCES_KEY, null);
  if (!stored || typeof stored !== 'object') return defaultVisualPreferences();
  const cardTheme = (stored as Partial<StoredVisualPreferences>).cardTheme;
  return { cardTheme: isCardThemeId(cardTheme) ? cardTheme : DEFAULT_CARD_THEME };
}

export function saveVisualPreferences(preferences: VisualPreferences): void {
  const payload: StoredVisualPreferences = {
    version: VISUAL_PREFERENCES_VERSION,
    cardTheme: isCardThemeId(preferences.cardTheme) ? preferences.cardTheme : DEFAULT_CARD_THEME,
  };
  storage.set(VISUAL_PREFERENCES_KEY, payload);
}
