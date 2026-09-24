import { describe, expect, it } from 'vitest';
import { nextStartupState, startupEventForKey } from '../src/startup/startup';

describe('startup flow', () => {
  it('moves from awaiting input through the intro to the game', () => {
    expect(nextStartupState('AWAITING_INPUT', 'start')).toBe('INTRO');
    expect(nextStartupState('INTRO', 'ended')).toBe('GAME');
  });

  it('supports skip controls without allowing unrelated transitions', () => {
    expect(startupEventForKey('AWAITING_INPUT', 'Enter')).toBe('start');
    expect(startupEventForKey('AWAITING_INPUT', ' ')).toBe('start');
    expect(startupEventForKey('INTRO', 'Enter')).toBe('skip');
    expect(startupEventForKey('INTRO', 'Escape')).toBe('skip');
    expect(startupEventForKey('INTRO', 'a')).toBeNull();
    expect(nextStartupState('AWAITING_INPUT', 'skip')).toBe('AWAITING_INPUT');
  });

  it('falls back to the game when intro playback fails', () => {
    expect(nextStartupState('INTRO', 'failed')).toBe('GAME');
  });
});

