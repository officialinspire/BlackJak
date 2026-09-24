import { describe, expect, it } from 'vitest';
import { BLACKJAK_ASSET_URLS } from '../src/assets/blackjak-assets';
import {
  ATLAS_SHEETS,
  ATLAS_SHEET_IDS,
  CARD_DECKS,
  CARD_THEME_IDS,
  DEALER_SPRITES,
  DEALER_SPRITE_IDS,
  DIALOGUE_BAR_LAYOUT,
  MENU_BAR_LAYOUT,
  SHEET_RANK_ORDER,
  TABLE_LAYOUT,
  cardFaceRect,
  listAtlasEntries,
  rectContains,
  rectsOverlap,
  validateAtlas,
  type AtlasEntry,
  type AtlasSheetId,
} from '../src/data/visual-atlas';
import { RANKS, SUITS } from '../src/game/types';
import { atlasSpriteMarkup, cardSpriteMarkup, dealerSpriteMarkup } from '../src/ui/atlas';
import dealerPng from '../blackjak-sprite-sheet.png?inline';
import tablePng from '../blackjak-table.png?inline';
import dialogueBarPng from '../dialogue-status-bar.png?inline';
import menuBarPng from '../menu-bar.png?inline';
import cardsStandardPng from '../blackjak-cards-standard.png?inline';
import cardsJakPng from '../blackjak-cards-jak-theme.png?inline';
import cardsInspirePng from '../blackjak-cards-inspire-theme.png?inline';

// Real file bytes (as base64 data URLs) so dimensions are checked against the PNGs themselves.
const PNG_DATA: Record<AtlasSheetId, string> = {
  dealer: dealerPng,
  table: tablePng,
  dialogueBar: dialogueBarPng,
  menuBar: menuBarPng,
  cardsStandard: cardsStandardPng,
  cardsJak: cardsJakPng,
  cardsInspire: cardsInspirePng,
};

/** Reads width, height and colour type straight from the PNG IHDR chunk. */
function readPngHeader(dataUrl: string): { width: number; height: number; alpha: boolean } {
  expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1, dataUrl.indexOf(',') + 1 + 48);
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  const u32 = (at: number) => new DataView(bytes.buffer).getUint32(at);
  expect(ascii(1, 4)).toBe('PNG');
  expect(ascii(12, 16)).toBe('IHDR');
  const colourType = bytes[25];
  return { width: u32(16), height: u32(20), alpha: colourType === 4 || colourType === 6 };
}

describe('visual atlas sheets', () => {
  it.each(ATLAS_SHEET_IDS)('%s dimensions match the real PNG', (id) => {
    const sheet = ATLAS_SHEETS[id];
    expect(readPngHeader(PNG_DATA[id])).toEqual({ width: sheet.width, height: sheet.height, alpha: sheet.alpha });
  });

  it('exposes a Vite-managed URL for every sheet', () => {
    for (const id of ATLAS_SHEET_IDS) {
      const stem = ATLAS_SHEETS[id].file.replace(/\.png$/, '');
      expect(BLACKJAK_ASSET_URLS[id]).toContain(stem);
    }
  });
});

describe('visual atlas rects', () => {
  const entries = listAtlasEntries();

  it('passes bounds, duplicate and overlap validation', () => {
    expect(validateAtlas(entries)).toEqual([]);
  });

  it('keeps every rect integer, positive and inside its sheet', () => {
    for (const { key, rect, sheet } of entries) {
      const bounds = ATLAS_SHEETS[sheet];
      expect([rect.x, rect.y, rect.width, rect.height].every(Number.isInteger), key).toBe(true);
      expect(rect.width > 0 && rect.height > 0, key).toBe(true);
      expect(rect.x >= 0 && rect.y >= 0, key).toBe(true);
      expect(rect.x + rect.width <= bounds.width, key).toBe(true);
      expect(rect.y + rect.height <= bounds.height, key).toBe(true);
    }
  });

  it('has unique keys and no duplicated rects within a sheet', () => {
    expect(new Set(entries.map((entry) => entry.key)).size).toBe(entries.length);
    const rects = entries.map(({ sheet, rect }) => `${sheet}:${rect.x},${rect.y},${rect.width},${rect.height}`);
    expect(new Set(rects).size).toBe(rects.length);
  });

  it('validator catches out-of-bounds, duplicate and overlapping rects', () => {
    const base: AtlasEntry = { key: 'a', sheet: 'dealer', kind: 'dealer', label: 'a', rect: { x: 0, y: 0, width: 10, height: 10 }, exclusiveGroup: 'g' };
    const issues = validateAtlas([
      base,
      { ...base, rect: { x: 5, y: 5, width: 10, height: 10 }, key: 'b' },
      { ...base, key: 'a', rect: { x: 100, y: 100, width: 5, height: 5 } },
      { ...base, key: 'c', rect: { x: 0, y: 0, width: 10, height: 10 }, exclusiveGroup: null },
      { ...base, key: 'd', rect: { x: 1440, y: 1080, width: 20, height: 20 }, exclusiveGroup: null },
      { ...base, key: 'e', rect: { x: 50.5, y: 50, width: 0, height: 5 }, exclusiveGroup: null },
    ]);
    expect(issues).toEqual(expect.arrayContaining([
      'duplicate key a',
      'c duplicates the rect of a',
      'd is outside dealer bounds',
      'e has non-integer coordinates',
      'e has non-positive size',
      'a overlaps b',
    ]));
  });
});

describe('dealer sprites', () => {
  it('maps 19 explicitly named poses in 5 / 6 / 8 rows', () => {
    expect(DEALER_SPRITE_IDS).toHaveLength(19);
    const framing = DEALER_SPRITE_IDS.map((id) => DEALER_SPRITES[id].framing);
    expect(framing.filter((f) => f === 'bust')).toHaveLength(5);
    expect(framing.filter((f) => f === 'half')).toHaveLength(6);
    expect(framing.filter((f) => f === 'full')).toHaveLength(8);
    for (const id of DEALER_SPRITE_IDS) expect(DEALER_SPRITES[id].id).toBe(id);
  });

  it('does not assume a uniform grid', () => {
    const widths = new Set(DEALER_SPRITE_IDS.map((id) => DEALER_SPRITES[id].rect.width));
    expect(widths.size).toBeGreaterThan(10);
  });
});

describe('card decks', () => {
  it.each(CARD_THEME_IDS)('%s maps all 52 faces plus jokers and back', (theme) => {
    const deck = CARD_DECKS[theme];
    expect([...deck.suitRowOrder].sort()).toEqual([...SUITS].sort());
    for (const suit of SUITS) {
      expect(deck.faces[suit]).toHaveLength(13);
      for (const rank of RANKS) expect(cardFaceRect(theme, suit, rank)).toBeDefined();
    }
    expect(Object.keys(deck.extras).sort()).toEqual(['back', 'joker-a', 'joker-b']);
  });

  it.each(CARD_THEME_IDS)('%s rows follow suitRowOrder top-to-bottom and ranks left-to-right', (theme) => {
    const deck = CARD_DECKS[theme];
    const rowTops = deck.suitRowOrder.map((suit) => deck.faces[suit][0].y);
    expect([...rowTops].sort((a, b) => a - b)).toEqual(rowTops);
    for (const suit of SUITS) {
      const xs = deck.faces[suit].map((rect) => rect.x);
      expect([...xs].sort((a, b) => a - b)).toEqual(xs);
    }
    const lastFaceRowBottom = Math.max(...SUITS.map((suit) => deck.faces[suit][0].y + deck.faces[suit][0].height));
    for (const rect of Object.values(deck.extras)) expect(rect.y).toBeGreaterThanOrEqual(lastFaceRowBottom);
  });

  it('records the inspire sheet’s different suit order', () => {
    expect(CARD_DECKS.standard.suitRowOrder).toEqual(['hearts', 'diamonds', 'clubs', 'spades']);
    expect(CARD_DECKS.jak.suitRowOrder).toEqual(['hearts', 'diamonds', 'clubs', 'spades']);
    expect(CARD_DECKS.inspire.suitRowOrder).toEqual(['spades', 'hearts', 'clubs', 'diamonds']);
  });

  it('keeps measured, non-uniform card widths (aces/court cards are wider)', () => {
    const std = CARD_DECKS.standard.faces.hearts;
    const king = std[SHEET_RANK_ORDER.indexOf('K')];
    const five = std[SHEET_RANK_ORDER.indexOf('5')];
    expect(king.width).toBeGreaterThan(five.width + 15);
    for (const theme of CARD_THEME_IDS) {
      const widths = new Set(SUITS.flatMap((suit) => CARD_DECKS[theme].faces[suit].map((rect) => rect.width)));
      expect(widths.size).toBeGreaterThan(3);
    }
  });

  it('gives every card a plausible playing-card aspect ratio', () => {
    for (const theme of CARD_THEME_IDS) {
      for (const suit of SUITS) {
        for (const rect of CARD_DECKS[theme].faces[suit]) {
          const ratio = rect.height / rect.width;
          expect(ratio).toBeGreaterThan(1.3);
          expect(ratio).toBeLessThan(2.2);
        }
      }
    }
  });
});

describe('layout regions', () => {
  it('nests menu header and plank rows inside the frame without overlap', () => {
    const { frame, header, rows } = MENU_BAR_LAYOUT;
    for (const item of [header, ...rows]) expect(rectContains(frame.rect, item.rect), item.id).toBe(true);
    const stacked = [header, ...rows];
    for (let i = 1; i < stacked.length; i += 1) {
      expect(rectsOverlap(stacked[i - 1].rect, stacked[i].rect)).toBe(false);
      expect(stacked[i].rect.y).toBeGreaterThan(stacked[i - 1].rect.y);
    }
  });

  it('nests the dialogue text panel inside its frame', () => {
    expect(rectContains(DIALOGUE_BAR_LAYOUT.frame.rect, DIALOGUE_BAR_LAYOUT.content.rect)).toBe(true);
  });

  it('keeps the 5 table player spots separate and ordered left to right', () => {
    const spots = TABLE_LAYOUT.playerSpots;
    expect(spots).toHaveLength(5);
    for (let i = 1; i < spots.length; i += 1) {
      expect(spots[i].rect.x).toBeGreaterThan(spots[i - 1].rect.x);
      expect(rectsOverlap(spots[i - 1].rect, spots[i].rect)).toBe(false);
    }
  });
});

describe('atlas renderer', () => {
  it('crops with an SVG viewBox equal to the source rect', () => {
    const rect = DEALER_SPRITES['bust-smug'].rect;
    const markup = dealerSpriteMarkup('bust-smug', { label: 'Jak "smug"' });
    expect(markup).toContain(`viewBox="${rect.x} ${rect.y} ${rect.width} ${rect.height}"`);
    expect(markup).toContain(`width="${ATLAS_SHEETS.dealer.width}" height="${ATLAS_SHEETS.dealer.height}"`);
    expect(markup).toContain('aria-label="Jak &quot;smug&quot;"');
    expect(markup).toContain(BLACKJAK_ASSET_URLS.dealer);
  });

  it('renders decorative sprites hidden from assistive tech', () => {
    const markup = atlasSpriteMarkup('menuBar', MENU_BAR_LAYOUT.frame.rect, { url: 'x.png' });
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('href="x.png"');
  });

  it('maps game cards to the themed sheet rect', () => {
    const rect = cardFaceRect('inspire', 'diamonds', 'A');
    const markup = cardSpriteMarkup('inspire', { suit: 'diamonds', rank: 'A' });
    expect(markup).toContain(`viewBox="${rect.x} ${rect.y} ${rect.width} ${rect.height}"`);
    expect(markup).toContain('data-atlas-sheet="cardsInspire"');
    expect(markup).toContain('aria-label="A of diamonds"');
  });
});
