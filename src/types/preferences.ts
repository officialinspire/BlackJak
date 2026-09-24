export interface FeedbackPreferences {
  master: boolean;
  music: boolean;
  sfx: boolean;
  haptics: boolean;
  /** Sound-effect level, 0–1. */
  volume: number;
  /** Background-music level, 0–1. */
  musicVolume: number;
}

export type CardThemePreference = 'standard' | 'jak' | 'inspire';

export interface VisualPreferences {
  cardTheme: CardThemePreference;
}
