import type { FeedbackPreferences } from '../types/preferences';

export type FeedbackCue =
  | 'button'
  | 'chip'
  | 'chip-select'
  | 'chip-place'
  | 'shuffle'
  | 'deal'
  | 'flip'
  | 'card-flip'
  | 'hit'
  | 'stand'
  | 'double'
  | 'split'
  | 'win'
  | 'loss'
  | 'blackjack'
  | 'achievement';

export type HapticCue = 'tap' | 'deal' | 'result' | 'blackjack' | 'achievement';

interface ToneLayer {
  readonly frequency: number;
  readonly duration: number;
  readonly type: OscillatorType;
  readonly offset?: number;
  readonly gain?: number;
  readonly endFrequency?: number;
}

interface NoiseLayer {
  readonly duration: number;
  readonly offset?: number;
  readonly gain?: number;
  readonly filterType?: BiquadFilterType;
  readonly filterFrequency?: number;
}

export interface SoundRecipe {
  readonly gain: number;
  readonly tones?: readonly ToneLayer[];
  readonly noise?: readonly NoiseLayer[];
}

const legacyChip: SoundRecipe = {
  gain: 0.095,
  tones: [
    { frequency: 540, duration: 0.035, type: 'square', gain: 0.38 },
    { frequency: 760, duration: 0.025, type: 'triangle', offset: 0.018, gain: 0.28 },
  ],
};

const legacyFlip: SoundRecipe = {
  gain: 0.075,
  tones: [{ frequency: 330, duration: 0.04, type: 'triangle', endFrequency: 440, gain: 0.35 }],
};

export const SOUND_RECIPES: Record<FeedbackCue, SoundRecipe> = {
  button: {
    gain: 0.075,
    tones: [{ frequency: 220, duration: 0.045, type: 'triangle', gain: 0.32 }],
  },
  chip: legacyChip,
  'chip-select': {
    gain: 0.095,
    tones: [
      { frequency: 720, duration: 0.025, type: 'square', gain: 0.28 },
      { frequency: 1080, duration: 0.022, type: 'triangle', offset: 0.015, gain: 0.22 },
    ],
  },
  'chip-place': {
    gain: 0.11,
    tones: [
      { frequency: 290, duration: 0.04, type: 'triangle', gain: 0.42 },
      { frequency: 470, duration: 0.03, type: 'square', offset: 0.018, gain: 0.2 },
    ],
    noise: [{ duration: 0.028, offset: 0.012, gain: 0.16, filterType: 'highpass', filterFrequency: 1400 }],
  },
  shuffle: {
    gain: 0.085,
    tones: [{ frequency: 115, duration: 0.12, type: 'triangle', gain: 0.1, endFrequency: 95 }],
    noise: [
      { duration: 0.12, gain: 0.22, filterType: 'bandpass', filterFrequency: 2100 },
      { duration: 0.11, offset: 0.075, gain: 0.19, filterType: 'bandpass', filterFrequency: 2550 },
    ],
  },
  deal: {
    gain: 0.09,
    tones: [{ frequency: 145, duration: 0.055, type: 'triangle', gain: 0.22, endFrequency: 105 }],
    noise: [{ duration: 0.065, gain: 0.2, filterType: 'highpass', filterFrequency: 1700 }],
  },
  flip: legacyFlip,
  'card-flip': {
    gain: 0.08,
    tones: [
      { frequency: 360, duration: 0.035, type: 'triangle', gain: 0.24, endFrequency: 520 },
      { frequency: 190, duration: 0.025, type: 'sine', offset: 0.027, gain: 0.2 },
    ],
    noise: [{ duration: 0.045, gain: 0.17, filterType: 'highpass', filterFrequency: 2200 }],
  },
  hit: {
    gain: 0.095,
    tones: [{ frequency: 215, duration: 0.045, type: 'triangle', gain: 0.28, endFrequency: 155 }],
    noise: [{ duration: 0.055, gain: 0.19, filterType: 'highpass', filterFrequency: 1850 }],
  },
  stand: {
    gain: 0.075,
    tones: [
      { frequency: 175, duration: 0.04, type: 'sine', gain: 0.28 },
      { frequency: 118, duration: 0.04, type: 'triangle', offset: 0.02, gain: 0.2 },
    ],
  },
  double: {
    gain: 0.11,
    tones: [
      { frequency: 320, duration: 0.035, type: 'triangle', gain: 0.35 },
      { frequency: 520, duration: 0.03, type: 'square', offset: 0.018, gain: 0.18 },
      { frequency: 170, duration: 0.05, type: 'triangle', offset: 0.052, gain: 0.24, endFrequency: 125 },
    ],
    noise: [{ duration: 0.055, offset: 0.048, gain: 0.18, filterType: 'highpass', filterFrequency: 1700 }],
  },
  split: {
    gain: 0.1,
    tones: [
      { frequency: 260, duration: 0.035, type: 'triangle', gain: 0.3 },
      { frequency: 390, duration: 0.035, type: 'triangle', offset: 0.055, gain: 0.26 },
    ],
    noise: [{ duration: 0.05, offset: 0.025, gain: 0.14, filterType: 'highpass', filterFrequency: 1900 }],
  },
  win: {
    gain: 0.1,
    tones: [
      { frequency: 392, duration: 0.07, type: 'sine', gain: 0.34 },
      { frequency: 523.25, duration: 0.11, type: 'triangle', offset: 0.05, gain: 0.32 },
    ],
  },
  loss: {
    gain: 0.09,
    tones: [
      { frequency: 164.81, duration: 0.09, type: 'sawtooth', gain: 0.2, endFrequency: 146.83 },
      { frequency: 123.47, duration: 0.13, type: 'triangle', offset: 0.055, gain: 0.28 },
    ],
  },
  blackjack: {
    gain: 0.105,
    tones: [
      { frequency: 392, duration: 0.06, type: 'sine', gain: 0.28 },
      { frequency: 523.25, duration: 0.08, type: 'sine', offset: 0.04, gain: 0.31 },
      { frequency: 783.99, duration: 0.15, type: 'triangle', offset: 0.085, gain: 0.34 },
    ],
  },
  achievement: {
    gain: 0.095,
    tones: [
      { frequency: 440, duration: 0.05, type: 'triangle', gain: 0.25 },
      { frequency: 659.25, duration: 0.09, type: 'sine', offset: 0.04, gain: 0.28 },
      { frequency: 880, duration: 0.12, type: 'triangle', offset: 0.085, gain: 0.3 },
    ],
  },
};

type AudioWindow = typeof window & { webkitAudioContext?: typeof AudioContext };

export class FeedbackEngine {
  private context: AudioContext | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!AudioCtor) return null;
    if (!this.context) this.context = new AudioCtor();
    return this.context;
  }

  activate(): void {
    const context = this.ensureContext();
    if (context?.state === 'suspended') void context.resume().catch(() => undefined);
  }

  play(cue: FeedbackCue, preferences: FeedbackPreferences): void {
    if (!preferences.master || !preferences.sfx || preferences.volume <= 0) return;
    const context = this.ensureContext();
    if (!context) return;
    this.activate();

    const now = context.currentTime;
    const recipe = SOUND_RECIPES[cue];
    const master = context.createGain();
    master.gain.setValueAtTime(Math.max(0.0001, preferences.volume * recipe.gain), now);
    master.connect(context.destination);

    for (const layer of recipe.tones ?? []) {
      const start = now + (layer.offset ?? 0);
      const end = start + layer.duration;
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = layer.type;
      osc.frequency.setValueAtTime(layer.frequency, start);
      if (layer.endFrequency) osc.frequency.exponentialRampToValueAtTime(layer.endFrequency, end);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(layer.gain ?? 0.3, start + Math.min(0.008, layer.duration / 3));
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(end + 0.01);
    }

    for (const layer of recipe.noise ?? []) {
      this.playNoise(context, master, layer, now);
    }
  }

  private playNoise(context: AudioContext, master: GainNode, layer: NoiseLayer, now: number): void {
    const start = now + (layer.offset ?? 0);
    const frames = Math.max(1, Math.floor(context.sampleRate * layer.duration));
    const buffer = context.createBuffer(1, frames, context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < frames; index += 1) {
      const envelope = 1 - index / frames;
      data[index] = (Math.random() * 2 - 1) * envelope;
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    filter.type = layer.filterType ?? 'highpass';
    filter.frequency.setValueAtTime(layer.filterFrequency ?? 1800, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(layer.gain ?? 0.15, start + Math.min(0.008, layer.duration / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + layer.duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
    source.stop(start + layer.duration + 0.01);
  }
}

export const feedbackEngine = new FeedbackEngine();

export function haptic(cue: HapticCue, preferences: FeedbackPreferences): void {
  if (!preferences.master || !preferences.haptics || typeof navigator === 'undefined') return;
  if (typeof navigator.vibrate !== 'function') return;

  const pattern: Record<HapticCue, number | number[]> = {
    tap: 10,
    deal: 12,
    result: [18, 28, 18],
    blackjack: [25, 35, 35],
    achievement: [16, 28, 16, 28, 28],
  };

  try {
    navigator.vibrate(pattern[cue]);
  } catch {
    // Vibration support varies by device/browser; feedback must never block gameplay.
  }
}
