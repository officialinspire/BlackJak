import type { Rank, Suit } from '../game/types';

/*
 * BlackJak visual atlas.
 *
 * Every rectangle below was measured from the real PNG pixels (alpha-channel
 * component labelling for sprites/cards, luminance outline profiles for the
 * wooden panels, colour masks for the table felt markings). None of the sheets
 * is a uniform grid: aces and court cards are wider than pip cards, rows sit at
 * different y offsets, card gaps are 1–5px, and dealer poses touch or overlap
 * their neighbours. Rectangles are therefore mapped explicitly, one by one.
 *
 * Where two dealer poses physically overlap (hands, hair, a flicked card), the
 * shared border was placed on the min-cost cut line so atlas rects never
 * intersect; at most ~1.6% of a pose's pixels fall outside its rect.
 *
 * Visual data only: nothing here affects rules, round state, or progression.
 */

export interface SpriteRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const r = (x: number, y: number, width: number, height: number): SpriteRect => ({ x, y, width, height });

// ---------------------------------------------------------------------------
// Sheets
// ---------------------------------------------------------------------------

export type AtlasSheetId =
  | 'dealer'
  | 'table'
  | 'dialogueBar'
  | 'menuBar'
  | 'cardsStandard'
  | 'cardsJak'
  | 'cardsInspire';

export interface AtlasSheet {
  readonly id: AtlasSheetId;
  /** Source file at the repository root. */
  readonly file: string;
  readonly width: number;
  readonly height: number;
  /** True when the PNG carries an alpha channel (colour type RGBA). */
  readonly alpha: boolean;
  readonly notes: string;
}

export const ATLAS_SHEETS: Readonly<Record<AtlasSheetId, AtlasSheet>> = {
  dealer: {
    id: 'dealer',
    file: 'blackjak-sprite-sheet.png',
    width: 1448,
    height: 1086,
    alpha: true,
    notes: 'Jak dealer poses: 5 busts, 6 half-body dealing poses, 8 full-body poses. Irregular spacing; neighbours overlap.',
  },
  table: {
    id: 'table',
    file: 'blackjak-table.png',
    width: 1448,
    height: 1086,
    alpha: false,
    notes: 'Opaque full-bleed top-down table background with 5 player card spots.',
  },
  dialogueBar: {
    id: 'dialogueBar',
    file: 'dialogue-status-bar.png',
    width: 2172,
    height: 724,
    alpha: false,
    notes: 'Opaque wooden dialogue/status panel on black. Stray light artifacts along the top 8px; frame rect excludes them.',
  },
  menuBar: {
    id: 'menuBar',
    file: 'menu-bar.png',
    width: 1672,
    height: 941,
    alpha: true,
    notes: 'Wooden menu board: header plaque plus 4 riveted plank rows.',
  },
  cardsStandard: {
    id: 'cardsStandard',
    file: 'blackjak-cards-standard.png',
    width: 1448,
    height: 1086,
    alpha: true,
    notes: 'Rows hearts, diamonds, clubs, spades (A..K), then 2 jokers + back. Court cards and A♠ are wider.',
  },
  cardsJak: {
    id: 'cardsJak',
    file: 'blackjak-cards-jak-theme.png',
    width: 1448,
    height: 1086,
    alpha: true,
    notes: 'Rows hearts, diamonds, clubs, spades (A..K), then 2 jokers + back. Aces are wider.',
  },
  cardsInspire: {
    id: 'cardsInspire',
    file: 'blackjak-cards-inspire-theme.png',
    width: 1448,
    height: 1086,
    alpha: true,
    notes: 'Rows SPADES, HEARTS, clubs, DIAMONDS (A..K) — different suit order; monochrome art. Then 2 jokers + back.',
  },
};

export const ATLAS_SHEET_IDS = Object.keys(ATLAS_SHEETS) as AtlasSheetId[];

// ---------------------------------------------------------------------------
// Dealer sprites
// ---------------------------------------------------------------------------

export type DealerFraming = 'bust' | 'half' | 'full';

export const DEALER_SPRITE_IDS = [
  'bust-talk',
  'bust-shocked',
  'bust-frustrated',
  'bust-thinking',
  'bust-smug',
  'deal-flick',
  'deal-fan',
  'deal-shuffle',
  'deal-reveal-ace',
  'deal-chip',
  'deal-shades',
  'full-laugh',
  'full-shrug',
  'full-point',
  'full-ponder',
  'full-arms-crossed',
  'full-celebrate',
  'full-idle',
  'full-present',
] as const;

export type DealerSpriteId = (typeof DEALER_SPRITE_IDS)[number];

export interface DealerSprite {
  readonly id: DealerSpriteId;
  readonly framing: DealerFraming;
  readonly label: string;
  readonly rect: SpriteRect;
}

const dealer = (id: DealerSpriteId, framing: DealerFraming, label: string, rect: SpriteRect): DealerSprite => ({
  id,
  framing,
  label,
  rect,
});

export const DEALER_SPRITES: Readonly<Record<DealerSpriteId, DealerSprite>> = {
  // Row 1 — busts (y ≈ 8–302)
  'bust-talk': dealer('bust-talk', 'bust', 'Talking, open-hand gesture', r(23, 11, 334, 291)),
  'bust-shocked': dealer('bust-shocked', 'bust', 'Shocked, round glasses', r(357, 10, 233, 290)),
  'bust-frustrated': dealer('bust-frustrated', 'bust', 'Gritted teeth, clenched fist', r(602, 9, 295, 292)),
  'bust-thinking': dealer('bust-thinking', 'bust', 'Hand on chin, alert marks', r(907, 8, 263, 293)),
  'bust-smug': dealer('bust-smug', 'bust', 'Smug smile', r(1176, 8, 246, 292)),
  // Row 2 — half-body dealing poses (y ≈ 306–605)
  'deal-flick': dealer('deal-flick', 'half', 'Flicking a card from the deck', r(17, 307, 265, 298)),
  'deal-fan': dealer('deal-fan', 'half', 'Holding a fanned hand', r(293, 306, 219, 276)),
  'deal-shuffle': dealer('deal-shuffle', 'half', 'Shuffling', r(523, 309, 229, 269)),
  'deal-reveal-ace': dealer('deal-reveal-ace', 'half', 'Tossing the ace of spades', r(760, 312, 208, 274)),
  'deal-chip': dealer('deal-chip', 'half', 'Cards and a chip in hand', r(979, 308, 235, 269)),
  'deal-shades': dealer('deal-shades', 'half', 'Adjusting sunglasses', r(1214, 309, 228, 276)),
  // Row 3 — full body (y ≈ 603–1070)
  'full-laugh': dealer('full-laugh', 'full', 'Laughing, hand out', r(13, 605, 179, 456)),
  'full-shrug': dealer('full-shrug', 'full', 'Two-handed shrug', r(192, 613, 198, 432)),
  'full-point': dealer('full-point', 'full', 'Pointing at the player', r(390, 605, 157, 456)),
  'full-ponder': dealer('full-ponder', 'full', 'Pondering, hand on chin', r(559, 605, 164, 458)),
  'full-arms-crossed': dealer('full-arms-crossed', 'full', 'Arms crossed', r(729, 609, 142, 441)),
  'full-celebrate': dealer('full-celebrate', 'full', 'Celebrating, fists up', r(871, 603, 209, 459)),
  'full-idle': dealer('full-idle', 'full', 'Idle, hands in pockets', r(1080, 605, 148, 443)),
  'full-present': dealer('full-present', 'full', 'Presenting, open palm', r(1251, 606, 190, 464)),
};

// ---------------------------------------------------------------------------
// Card decks
// ---------------------------------------------------------------------------

export type CardThemeId = 'standard' | 'jak' | 'inspire';
export const CARD_THEME_IDS: readonly CardThemeId[] = ['standard', 'jak', 'inspire'];

/** Column order used by every card sheet (the game's RANKS order differs). */
export const SHEET_RANK_ORDER = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const satisfies readonly Rank[];

export type CardExtraId = 'joker-a' | 'joker-b' | 'back';
export const CARD_EXTRA_IDS: readonly CardExtraId[] = ['joker-a', 'joker-b', 'back'];

type SuitRow = readonly [
  SpriteRect, SpriteRect, SpriteRect, SpriteRect, SpriteRect, SpriteRect, SpriteRect,
  SpriteRect, SpriteRect, SpriteRect, SpriteRect, SpriteRect, SpriteRect,
];

export interface CardDeckAtlas {
  readonly theme: CardThemeId;
  readonly sheet: AtlasSheetId;
  readonly label: string;
  /** Suit printed on each sheet row, top to bottom. */
  readonly suitRowOrder: readonly [Suit, Suit, Suit, Suit];
  /** Face rects per suit, indexed by SHEET_RANK_ORDER. */
  readonly faces: Readonly<Record<Suit, SuitRow>>;
  readonly extras: Readonly<Record<CardExtraId, SpriteRect>>;
}

export const CARD_DECKS: Readonly<Record<CardThemeId, CardDeckAtlas>> = {
  standard: {
    theme: 'standard',
    sheet: 'cardsStandard',
    label: 'Standard',
    suitRowOrder: ['hearts', 'diamonds', 'clubs', 'spades'],
    faces: {
      hearts: [r(15, 42, 103, 182), r(121, 42, 101, 182), r(224, 42, 102, 182), r(328, 42, 101, 182), r(431, 42, 101, 182), r(535, 42, 101, 182), r(638, 42, 100, 182), r(740, 42, 102, 182), r(845, 42, 100, 182), r(948, 42, 102, 182), r(1053, 43, 119, 182), r(1175, 43, 130, 182), r(1308, 43, 126, 182)],
      diamonds: [r(15, 240, 104, 186), r(121, 240, 101, 186), r(224, 241, 102, 185), r(328, 242, 101, 184), r(431, 242, 101, 184), r(535, 242, 100, 185), r(638, 242, 100, 185), r(740, 242, 102, 185), r(845, 242, 100, 185), r(948, 242, 102, 185), r(1053, 242, 119, 185), r(1175, 242, 130, 185), r(1308, 242, 126, 185)],
      clubs: [r(15, 444, 103, 190), r(121, 444, 101, 191), r(224, 445, 102, 190), r(328, 445, 101, 190), r(431, 445, 101, 190), r(535, 446, 100, 190), r(638, 446, 100, 190), r(740, 446, 102, 190), r(845, 446, 100, 190), r(947, 446, 103, 191), r(1053, 446, 119, 191), r(1175, 446, 130, 191), r(1308, 446, 126, 191)],
      spades: [r(15, 654, 113, 191), r(130, 654, 92, 191), r(224, 654, 102, 191), r(328, 654, 102, 191), r(432, 654, 102, 191), r(536, 654, 100, 191), r(638, 654, 100, 192), r(740, 654, 103, 192), r(846, 655, 100, 192), r(948, 655, 105, 192), r(1055, 655, 117, 192), r(1175, 655, 130, 192), r(1308, 655, 126, 192)],
    },
    extras: {
      'joker-a': r(15, 859, 153, 201),
      'joker-b': r(176, 859, 152, 201),
      back: r(339, 859, 135, 203),
    },
  },
  jak: {
    theme: 'jak',
    sheet: 'cardsJak',
    label: "Jak's Cosmic",
    suitRowOrder: ['hearts', 'diamonds', 'clubs', 'spades'],
    faces: {
      hearts: [r(16, 26, 124, 187), r(142, 26, 108, 187), r(253, 26, 106, 187), r(362, 26, 105, 187), r(470, 26, 105, 187), r(577, 26, 105, 187), r(685, 26, 105, 187), r(793, 26, 106, 187), r(901, 26, 104, 187), r(1007, 26, 98, 187), r(1107, 26, 104, 187), r(1213, 26, 107, 187), r(1322, 26, 111, 187)],
      diamonds: [r(16, 223, 124, 188), r(142, 223, 108, 188), r(253, 224, 106, 187), r(362, 224, 105, 187), r(470, 224, 104, 187), r(577, 224, 105, 187), r(685, 224, 105, 187), r(793, 224, 106, 187), r(901, 224, 104, 187), r(1007, 224, 98, 187), r(1107, 224, 104, 187), r(1213, 223, 107, 188), r(1323, 223, 111, 188)],
      clubs: [r(15, 424, 125, 194), r(142, 424, 108, 194), r(252, 424, 107, 194), r(362, 424, 105, 193), r(470, 425, 104, 192), r(577, 425, 105, 191), r(685, 425, 105, 191), r(793, 425, 106, 191), r(901, 425, 103, 191), r(1007, 425, 98, 191), r(1108, 426, 103, 191), r(1213, 426, 107, 191), r(1323, 426, 110, 191)],
      spades: [r(15, 631, 125, 196), r(142, 631, 108, 196), r(252, 631, 107, 196), r(362, 631, 105, 196), r(470, 631, 104, 196), r(576, 631, 106, 196), r(685, 631, 105, 196), r(793, 631, 106, 196), r(901, 632, 104, 195), r(1007, 632, 99, 196), r(1108, 632, 103, 196), r(1213, 632, 107, 196), r(1323, 632, 111, 196)],
    },
    extras: {
      'joker-a': r(15, 833, 155, 234),
      'joker-b': r(172, 834, 158, 233),
      back: r(332, 834, 177, 234),
    },
  },
  inspire: {
    theme: 'inspire',
    sheet: 'cardsInspire',
    label: 'Inspire Mono',
    suitRowOrder: ['spades', 'hearts', 'clubs', 'diamonds'],
    faces: {
      spades: [r(39, 38, 114, 168), r(158, 38, 99, 168), r(262, 38, 97, 168), r(364, 37, 99, 169), r(468, 37, 100, 169), r(572, 37, 100, 169), r(676, 37, 100, 169), r(781, 38, 100, 168), r(885, 37, 100, 169), r(990, 37, 98, 169), r(1093, 37, 100, 170), r(1198, 37, 103, 170), r(1305, 37, 109, 170)],
      hearts: [r(39, 221, 115, 173), r(158, 221, 99, 173), r(262, 221, 97, 173), r(364, 221, 99, 173), r(468, 221, 100, 173), r(572, 221, 100, 173), r(676, 221, 100, 173), r(781, 221, 100, 173), r(885, 221, 100, 173), r(990, 221, 98, 173), r(1093, 222, 100, 172), r(1198, 222, 103, 172), r(1305, 222, 109, 173)],
      clubs: [r(39, 411, 115, 175), r(158, 411, 99, 174), r(261, 411, 99, 174), r(364, 411, 99, 174), r(468, 411, 100, 174), r(572, 411, 100, 174), r(676, 411, 100, 174), r(781, 411, 100, 175), r(885, 411, 100, 175), r(990, 411, 99, 175), r(1093, 411, 101, 175), r(1198, 411, 103, 175), r(1305, 411, 109, 175)],
      diamonds: [r(39, 608, 115, 172), r(158, 608, 99, 172), r(261, 608, 98, 172), r(364, 608, 99, 172), r(468, 608, 100, 172), r(572, 608, 99, 172), r(676, 608, 100, 172), r(781, 608, 100, 172), r(884, 608, 100, 172), r(989, 608, 99, 172), r(1093, 608, 100, 173), r(1198, 608, 102, 173), r(1304, 608, 110, 173)],
    },
    extras: {
      'joker-a': r(40, 795, 153, 245),
      'joker-b': r(221, 795, 161, 245),
      back: r(411, 798, 168, 245),
    },
  },
};

export function cardFaceRect(theme: CardThemeId, suit: Suit, rank: Rank): SpriteRect {
  const column = SHEET_RANK_ORDER.indexOf(rank);
  const rect = CARD_DECKS[theme].faces[suit][column];
  if (!rect) throw new Error(`No ${theme} atlas rect for ${rank} of ${suit}`);
  return rect;
}

export function cardExtraRect(theme: CardThemeId, extra: CardExtraId): SpriteRect {
  return CARD_DECKS[theme].extras[extra];
}

// ---------------------------------------------------------------------------
// Panel / table layout regions
// ---------------------------------------------------------------------------

export interface LayoutRegion {
  readonly id: string;
  readonly label: string;
  readonly rect: SpriteRect;
}

const region = (id: string, label: string, rect: SpriteRect): LayoutRegion => ({ id, label, rect });

export interface MenuBarLayout {
  readonly sheet: 'menuBar';
  /** Whole wooden board including rivets and stickers. */
  readonly frame: LayoutRegion;
  /** Inner face of the top plaque (inside its dark outline). */
  readonly header: LayoutRegion;
  /** Inner faces of the four riveted planks, top to bottom. */
  readonly rows: readonly [LayoutRegion, LayoutRegion, LayoutRegion, LayoutRegion];
}

export const MENU_BAR_LAYOUT: MenuBarLayout = {
  sheet: 'menuBar',
  frame: region('menu-frame', 'Menu board', r(44, 25, 1584, 880)),
  header: region('menu-header', 'Header plaque', r(144, 91, 1385, 216)),
  rows: [
    region('menu-row-1', 'Plank 1', r(213, 356, 1245, 102)),
    region('menu-row-2', 'Plank 2', r(213, 480, 1245, 103)),
    region('menu-row-3', 'Plank 3', r(213, 603, 1245, 96)),
    region('menu-row-4', 'Plank 4', r(213, 718, 1245, 95)),
  ],
};

export interface DialogueBarLayout {
  readonly sheet: 'dialogueBar';
  /** Outer wooden frame, excluding the black matte and top-edge artifacts. */
  readonly frame: LayoutRegion;
  /** Recessed text panel inside the frame border. */
  readonly content: LayoutRegion;
}

export const DIALOGUE_BAR_LAYOUT: DialogueBarLayout = {
  sheet: 'dialogueBar',
  frame: region('dialogue-frame', 'Dialogue frame', r(17, 17, 2139, 690)),
  content: region('dialogue-content', 'Dialogue text panel', r(125, 124, 1891, 469)),
};

export interface TableLayout {
  readonly sheet: 'table';
  readonly chipTray: LayoutRegion;
  readonly shoe: LayoutRegion;
  readonly title: LayoutRegion;
  /** Axis-aligned bounds of the 5 printed card outlines, left to right. */
  readonly playerSpots: readonly [LayoutRegion, LayoutRegion, LayoutRegion, LayoutRegion, LayoutRegion];
}

export const TABLE_LAYOUT: TableLayout = {
  sheet: 'table',
  chipTray: region('table-chip-tray', 'Chip tray', r(452, 0, 562, 184)),
  shoe: region('table-shoe', 'Card shoe', r(1033, 0, 200, 250)),
  title: region('table-title', 'BLACKJAK felt title', r(510, 260, 464, 144)),
  playerSpots: [
    region('table-spot-1', 'Player spot 1', r(164, 522, 214, 214)),
    region('table-spot-2', 'Player spot 2', r(378, 622, 203, 224)),
    region('table-spot-3', 'Player spot 3', r(648, 656, 162, 208)),
    region('table-spot-4', 'Player spot 4', r(871, 620, 202, 228)),
    region('table-spot-5', 'Player spot 5', r(1077, 522, 214, 218)),
  ],
};

// ---------------------------------------------------------------------------
// Flattened view + validation (used by tests and the debug inspector)
// ---------------------------------------------------------------------------

export type AtlasEntryKind = 'dealer' | 'card' | 'card-extra' | 'layout';

export interface AtlasEntry {
  /** Globally unique key, e.g. `card:standard:hearts:A`. */
  readonly key: string;
  readonly sheet: AtlasSheetId;
  readonly kind: AtlasEntryKind;
  readonly label: string;
  readonly rect: SpriteRect;
  /**
   * Entries in the same non-null group are distinct images on the sheet and
   * must not overlap. Layout regions nest by design, so they have no group.
   */
  readonly exclusiveGroup: string | null;
}

const SUIT_SYMBOL: Record<Suit, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };

export function listAtlasEntries(): AtlasEntry[] {
  const entries: AtlasEntry[] = [];

  for (const id of DEALER_SPRITE_IDS) {
    const sprite = DEALER_SPRITES[id];
    entries.push({ key: `dealer:${id}`, sheet: 'dealer', kind: 'dealer', label: sprite.label, rect: sprite.rect, exclusiveGroup: 'dealer' });
  }

  for (const theme of CARD_THEME_IDS) {
    const deck = CARD_DECKS[theme];
    for (const suit of deck.suitRowOrder) {
      SHEET_RANK_ORDER.forEach((rank, column) => {
        entries.push({
          key: `card:${theme}:${suit}:${rank}`,
          sheet: deck.sheet,
          kind: 'card',
          label: `${rank}${SUIT_SYMBOL[suit]}`,
          rect: deck.faces[suit][column],
          exclusiveGroup: deck.sheet,
        });
      });
    }
    for (const extra of CARD_EXTRA_IDS) {
      entries.push({ key: `card:${theme}:${extra}`, sheet: deck.sheet, kind: 'card-extra', label: extra, rect: deck.extras[extra], exclusiveGroup: deck.sheet });
    }
  }

  const layouts: LayoutRegion[][] = [
    [MENU_BAR_LAYOUT.frame, MENU_BAR_LAYOUT.header, ...MENU_BAR_LAYOUT.rows],
    [DIALOGUE_BAR_LAYOUT.frame, DIALOGUE_BAR_LAYOUT.content],
    [TABLE_LAYOUT.chipTray, TABLE_LAYOUT.shoe, TABLE_LAYOUT.title, ...TABLE_LAYOUT.playerSpots],
  ];
  const layoutSheets: AtlasSheetId[] = ['menuBar', 'dialogueBar', 'table'];
  layouts.forEach((regions, index) => {
    for (const item of regions) {
      entries.push({ key: `layout:${item.id}`, sheet: layoutSheets[index], kind: 'layout', label: item.label, rect: item.rect, exclusiveGroup: null });
    }
  });

  return entries;
}

export function rectsOverlap(a: SpriteRect, b: SpriteRect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

export function rectContains(outer: SpriteRect, inner: SpriteRect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

export function rectWithinSheet(rect: SpriteRect, sheet: AtlasSheet): boolean {
  return rectContains({ x: 0, y: 0, width: sheet.width, height: sheet.height }, rect);
}

/** Returns human-readable problems; an empty array means the atlas is sound. */
export function validateAtlas(entries: readonly AtlasEntry[] = listAtlasEntries()): string[] {
  const issues: string[] = [];
  const keys = new Set<string>();
  const rectKeys = new Map<string, string>();

  for (const entry of entries) {
    const { rect } = entry;
    if (keys.has(entry.key)) issues.push(`duplicate key ${entry.key}`);
    keys.add(entry.key);

    if (![rect.x, rect.y, rect.width, rect.height].every(Number.isInteger)) issues.push(`${entry.key} has non-integer coordinates`);
    if (rect.width <= 0 || rect.height <= 0) issues.push(`${entry.key} has non-positive size`);
    if (!rectWithinSheet(rect, ATLAS_SHEETS[entry.sheet])) issues.push(`${entry.key} is outside ${entry.sheet} bounds`);

    const rectKey = `${entry.sheet}:${rect.x},${rect.y},${rect.width},${rect.height}`;
    const clash = rectKeys.get(rectKey);
    if (clash) issues.push(`${entry.key} duplicates the rect of ${clash}`);
    rectKeys.set(rectKey, entry.key);
  }

  const grouped = new Map<string, AtlasEntry[]>();
  for (const entry of entries) {
    if (!entry.exclusiveGroup) continue;
    const list = grouped.get(entry.exclusiveGroup) ?? [];
    list.push(entry);
    grouped.set(entry.exclusiveGroup, list);
  }
  for (const list of grouped.values()) {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        if (rectsOverlap(list[i].rect, list[j].rect)) issues.push(`${list[i].key} overlaps ${list[j].key}`);
      }
    }
  }

  return issues;
}
