import { describe, expect, it } from 'vitest';
import { selectDialogue, type RandomSource } from '../src/game';

const fixed = (value: number): RandomSource => ({ next: () => value });

describe('dealer dialogue selection', () => {
  it('is deterministic with an injected random source', () => {
    const first = selectDialogue('game_start', { recentIds: [] }, fixed(0));
    const second = selectDialogue('game_start', { recentIds: [] }, fixed(0));
    expect(first.selection).toEqual(second.selection);
  });

  it('avoids immediately repeating recently used lines when alternatives exist', () => {
    const first = selectDialogue('player_win', { recentIds: [] }, fixed(0));
    const second = selectDialogue('player_win', first.memory, fixed(0));
    expect(second.selection.id).not.toBe(first.selection.id);
  });

  it('keeps recent dialogue memory bounded', () => {
    let memory = { recentIds: [] as string[] };
    for (const event of ['idle', 'player_win', 'player_loss', 'push', 'return_player'] as const) {
      memory = selectDialogue(event, memory, fixed(0.2)).memory;
    }
    expect(memory.recentIds.length).toBeLessThanOrEqual(4);
  });

  it('supports weighted selection while still honoring valid bounds', () => {
    const early = selectDialogue('game_start', { recentIds: [] }, fixed(0));
    const late = selectDialogue('game_start', { recentIds: [] }, fixed(0.999));
    expect(early.selection.text.length).toBeGreaterThan(0);
    expect(late.selection.text.length).toBeGreaterThan(0);
    expect(early.selection.id).not.toBe(late.selection.id);
  });
});
