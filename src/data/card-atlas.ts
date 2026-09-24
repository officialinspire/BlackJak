import { RANKS, SUITS, type Card, type Rank, type Suit } from '../game/types';
import {
  ATLAS_SHEETS,
  CARD_DECKS,
  CARD_THEME_IDS,
  SHEET_RANK_ORDER,
  type AtlasSheetId,
  type CardThemeId,
  type SpriteRect,
} from './visual-atlas';

/*
 * Strict Card {rank, suit} → sprite mapping for the three deck themes.
 *
 * The rects come from the measured atlas (visual-atlas.ts). Every one of the
 * 3 × 52 faces was inspected visually: the corner index (rank + suit) matches
 * its key in all three sheets, and pip counts were checked on every number card.
 * Cells whose art is wrong are listed in CARD_ART_ISSUES; the renderer
 * falls back to the drawn CSS face for them instead of showing misleading art.
 */

export type CardKey = `${Rank}-${Suit}`;

export const cardKey = (card: Pick<Card, 'rank' | 'suit'>): CardKey => `${card.rank}-${card.suit}`;

/** All 52 keys in game order (suit-major, RANKS order). */
export const CARD_KEYS: readonly CardKey[] = SUITS.flatMap((suit) => RANKS.map((rank) => cardKey({ rank, suit })));

export interface CardThemeAtlas {
  readonly theme: CardThemeId;
  readonly sheet: AtlasSheetId;
  readonly label: string;
  readonly faces: Readonly<Record<CardKey, SpriteRect>>;
  readonly back: SpriteRect;
}

function buildTheme(theme: CardThemeId): CardThemeAtlas {
  const deck = CARD_DECKS[theme];
  const faces = {} as Record<CardKey, SpriteRect>;
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const column = SHEET_RANK_ORDER.indexOf(rank);
      const rect = deck.faces[suit][column];
      if (column < 0 || !rect) throw new Error(`Missing ${theme} sprite for ${rank} of ${suit}`);
      faces[cardKey({ rank, suit })] = rect;
    }
  }
  return { theme, sheet: deck.sheet, label: deck.label, faces, back: deck.extras.back };
}

export const CARD_THEMES: Readonly<Record<CardThemeId, CardThemeAtlas>> = Object.fromEntries(
  CARD_THEME_IDS.map((theme) => [theme, buildTheme(theme)]),
) as Record<CardThemeId, CardThemeAtlas>;

export const DEFAULT_CARD_THEME: CardThemeId = 'standard';

export function isCardThemeId(value: unknown): value is CardThemeId {
  return typeof value === 'string' && (CARD_THEME_IDS as readonly string[]).includes(value);
}

export interface CardArtIssue {
  readonly theme: CardThemeId;
  readonly key: CardKey;
  readonly issue: string;
}

/**
 * Sprite cells found to be wrong during visual verification. The index on each
 * of these cards correctly reads "7", but the art shows six pips (no center
 * pip) and a mirrored "Z" as the bottom index. The inspire 7♦ is correct.
 */
export const CARD_ART_ISSUES: readonly CardArtIssue[] = [
  { theme: 'inspire', key: '7-spades', issue: 'Shows 6 pips instead of 7 (index reads 7).' },
  { theme: 'inspire', key: '7-hearts', issue: 'Shows 6 pips instead of 7 (index reads 7).' },
  { theme: 'inspire', key: '7-clubs', issue: 'Shows 6 pips instead of 7 (index reads 7).' },
];

export function cardArtIssue(theme: CardThemeId, card: Pick<Card, 'rank' | 'suit'>): CardArtIssue | null {
  const key = cardKey(card);
  return CARD_ART_ISSUES.find((entry) => entry.theme === theme && entry.key === key) ?? null;
}

/** Sprite rect for a face, or null when that cell is flagged as unusable. */
export function cardFaceSprite(theme: CardThemeId, card: Pick<Card, 'rank' | 'suit'>): SpriteRect | null {
  if (cardArtIssue(theme, card)) return null;
  return CARD_THEMES[theme].faces[cardKey(card)];
}

export function cardBackSprite(theme: CardThemeId): SpriteRect {
  return CARD_THEMES[theme].back;
}

export function cardThemeSheet(theme: CardThemeId): AtlasSheetId {
  return CARD_THEMES[theme].sheet;
}

/** The sheet the theme draws from, for bounds checks. */
export function cardThemeSheetSize(theme: CardThemeId): { width: number; height: number } {
  const sheet = ATLAS_SHEETS[CARD_THEMES[theme].sheet];
  return { width: sheet.width, height: sheet.height };
}
