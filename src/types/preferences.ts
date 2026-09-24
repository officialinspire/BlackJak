export interface FeedbackPreferences {
  master: boolean;
  sfx: boolean;
  ambience: boolean;
  haptics: boolean;
  volume: number;
}

export type CardThemePreference = 'standard' | 'jak' | 'inspire';

export interface VisualPreferences {
  cardTheme: CardThemePreference;
}
