import { describe, expect, it } from 'vitest';
import { preloadArtSheets, preloadSheetOrder, whenCriticalArtReady } from '../src/assets/preload';
import { ATLAS_SHEET_IDS } from '../src/data/visual-atlas';

describe('art sheet preloading', () => {
  it('queues the first-frame art and the active deck first, then every other sheet once', () => {
    const order = preloadSheetOrder('jak');
    expect(order.slice(0, 5)).toEqual(['menuBar', 'table', 'dealer', 'dialogueBar', 'cardsJak']);
    expect([...order].sort()).toEqual([...ATLAS_SHEET_IDS].sort());
  });

  it('is a harmless no-op without a browser Image and never blocks the game', async () => {
    expect(() => preloadArtSheets('standard')).not.toThrow();
    await expect(whenCriticalArtReady('standard', 10)).resolves.toBeUndefined();
  });
});
