import type { FeedbackPreferences } from '../types/preferences';

export type FeedbackCue =
  | 'button'
  | 'chip'
  | 'deal'
  | 'flip'
  | 'win'
  | 'loss'
  | 'blackjack'
  | 'achievement';

export type HapticCue = 'tap' | 'deal' | 'result' | 'blackjack' | 'achievement';

type AudioWindow = typeof window & { webkitAudioContext?: typeof AudioContext };

class FeedbackEngine {
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
    const master = context.createGain();
    master.gain.setValueAtTime(Math.max(0.0001, preferences.volume * 0.13), now);
    master.connect(context.destination);

    const tones: Record<FeedbackCue, readonly [number, number, OscillatorType][]> = {
      button: [[220, 0.045, 'triangle']],
      chip: [[540, 0.035, 'square'], [760, 0.025, 'triangle']],
      deal: [[150, 0.055, 'triangle'], [105, 0.07, 'sine']],
      flip: [[330, 0.04, 'triangle']],
      win: [[392, 0.07, 'sine'], [523.25, 0.11, 'triangle']],
      loss: [[164.81, 0.09, 'sawtooth'], [123.47, 0.13, 'triangle']],
      blackjack: [[392, 0.06, 'sine'], [523.25, 0.08, 'sine'], [783.99, 0.15, 'triangle']],
      achievement: [[440, 0.05, 'triangle'], [659.25, 0.09, 'sine'], [880, 0.12, 'triangle']],
    };

    let offset = 0;
    for (const [frequency, duration, type] of tones[cue]) {
      const osc = context.createOscillator();
      const gain = context.createGain();
      const start = now + offset;
      const end = start + duration;
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.8, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(end + 0.01);
      offset += duration * 0.55;
    }
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
