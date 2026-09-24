import { afterEach, describe, expect, it } from 'vitest';
import {
  CARD_ART_ISSUES,
  CARD_KEYS,
  CARD_THEMES,
  DEFAULT_CARD_THEME,
  cardBackSprite,
  cardFaceSprite,
  cardKey,
  cardThemeSheetSize,
} from '../src/data/card-atlas';
import { CARD_DECKS, CARD_THEME_IDS, SHEET_RANK_ORDER, rectContains, rectsOverlap, type SpriteRect } from '../src/data/visual-atlas';
import { RANKS, SUITS } from '../src/game/types';
import { defaultVisualPreferences, loadVisualPreferences, saveVisualPreferences } from '../src/storage/visual-preferences';

const inside = (rect: SpriteRect, theme: (typeof CARD_THEME_IDS)[number]): boolean => {
  const { width, height } = cardThemeSheetSize(theme);
  return rectContains({ x: 0, y: 0, width, height }, rect);
};

describe('card keys', () => {
  it('defines exactly 52 unique rank × suit keys', () => {
    expect(CARD_KEYS).toHaveLength(52);
    expect(new Set(CARD_KEYS).size).toBe(52);
    for (const suit of SUITS) for (const rank of RANKS) expect(CARD_KEYS).toContain(cardKey({ rank, suit }));
  });
});

describe.each(CARD_THEME_IDS)('%s deck mapping', (theme) => {
  const atlas = CARD_THEMES[theme];

  it('exposes all 52 faces and nothing else', () => {
    expect(Object.keys(atlas.faces).sort()).toEqual([...CARD_KEYS].sort());
  });

  it('has no duplicate or overlapping face rects', () => {
    const rects = Object.values(atlas.faces);
    const serialized = rects.map((r) => `${r.x},${r.y},${r.width},${r.height}`);
    expect(new Set(serialized).size).toBe(52);
    for (let i = 0; i < rects.length; i += 1) {
      for (let j = i + 1; j < rects.length; j += 1) expect(rectsOverlap(rects[i], rects[j])).toBe(false);
    }
  });

  it('keeps every face and the back inside the sheet bounds', () => {
    for (const [key, rect] of Object.entries(atlas.faces)) expect(inside(rect, theme), key).toBe(true);
    expect(inside(atlas.back, theme)).toBe(true);
  });

  it('has a card back distinct from every face', () => {
    const back = cardBackSprite(theme);
    expect(back.width).toBeGreaterThan(0);
    for (const rect of Object.values(atlas.faces)) expect(rectsOverlap(back, rect)).toBe(false);
  });

  it('maps Card {rank, suit} to the cell in that suit’s row and rank’s column', () => {
    const deck = CARD_DECKS[theme];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        expect(atlas.faces[cardKey({ rank, suit })]).toBe(deck.faces[suit][SHEET_RANK_ORDER.indexOf(rank)]);
      }
    }
  });

  it('returns a sprite for every card except flagged cells', () => {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        const flagged = CARD_ART_ISSUES.some((issue) => issue.theme === theme && issue.key === cardKey({ rank, suit }));
        expect(cardFaceSprite(theme, { rank, suit }) === null, `${rank}-${suit}`).toBe(flagged);
      }
    }
  });
});

describe('visual verification findings', () => {
  it('flags the Inspire 7♠/7♥/7♣ (six pips) and nothing in the other decks', () => {
    expect(CARD_ART_ISSUES.map((issue) => `${issue.theme}:${issue.key}`).sort()).toEqual([
      'inspire:7-clubs',
      'inspire:7-hearts',
      'inspire:7-spades',
    ]);
    expect(cardFaceSprite('inspire', { rank: '7', suit: 'diamonds' })).not.toBeNull();
  });

  it('records the Inspire sheet’s different suit row order', () => {
    const tops = (theme: (typeof CARD_THEME_IDS)[number]) =>
      SUITS.map((suit) => [suit, CARD_THEMES[theme].faces[cardKey({ rank: 'A', suit })].y] as const)
        .sort((a, b) => a[1] - b[1])
        .map(([suit]) => suit);
    expect(tops('inspire')).toEqual(['spades', 'hearts', 'clubs', 'diamonds']);
    expect(tops('standard')).toEqual(['hearts', 'diamonds', 'clubs', 'spades']);
    expect(tops('jak')).toEqual(['hearts', 'diamonds', 'clubs', 'spades']);
  });
});

describe('card theme preference', () => {
  const originalWindow = globalThis.window;
  afterEach(() => Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow }));

  function memoryStorage(seed: Record<string, string> = {}): Map<string, string> {
    const values = new Map(Object.entries(seed));
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => values.get(key) ?? null,
          setItem: (key: string, value: string) => values.set(key, value),
          removeItem: (key: string) => values.delete(key),
        },
      },
    });
    return values;
  }

  it('defaults to the standard deck for fresh and existing saves without the key', () => {
    memoryStorage({ 'blackjak:v1:profile': '{"version":1,"value":{}}' });
    expect(DEFAULT_CARD_THEME).toBe('standard');
    expect(loadVisualPreferences()).toEqual(defaultVisualPreferences());
    expect(loadVisualPreferences().cardTheme).toBe('standard');
  });

  it('persists and reloads each theme', () => {
    memoryStorage();
    for (const theme of CARD_THEME_IDS) {
      saveVisualPreferences({ cardTheme: theme });
      expect(loadVisualPreferences().cardTheme).toBe(theme);
    }
  });

  it('migrates corrupted or unknown stored values safely', () => {
    const values = memoryStorage();
    saveVisualPreferences({ cardTheme: 'jak' });
    const [key] = [...values.keys()];

    for (const raw of ['not json', '{"version":1,"value":null}', '{"version":1,"value":"jak"}', '{"version":1,"value":{"cardTheme":"neon"}}', '{"version":99,"value":{"cardTheme":"jak"}}']) {
      values.set(key, raw);
      expect(loadVisualPreferences().cardTheme, raw).toBe('standard');
    }
  });
});
