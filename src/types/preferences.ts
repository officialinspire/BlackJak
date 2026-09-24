export interface FeedbackPreferences {
  master: boolean;
  music: boolean;
  sfx: boolean;
  haptics: boolean;
  volume: number;
}

export type CardThemePreference = 'standard' | 'jak' | 'inspire';

export interface VisualPreferences {
  cardTheme: CardThemePreference;
}
