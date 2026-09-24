import { MENU_BAR_LAYOUT, type SpriteRect } from '../data/visual-atlas';

/*
 * Menu board (menu-bar.png) layout: hit areas for the header plaque and the four
 * planks, normalized to the board's frame rect (0..1). Positions are emitted as
 * CSS custom properties, so menu-board.css has no coordinates of its own.
 *
 * Visual faces come from the measured MENU_BAR_LAYOUT. Hit areas grow outward
 * to the midpoints of the gaps between planks (and over each plank's dark
 * outline), so every row is as tall a touch target as the art allows without
 * overlapping its neighbours.
 */

const FRAME = MENU_BAR_LAYOUT.frame.rect;
const HEADER = MENU_BAR_LAYOUT.header.rect;
const ROWS = MENU_BAR_LAYOUT.rows.map((row) => row.rect);

/** Dark outline drawn around each plank/plaque face (source px, measured). */
const PLANK_OUTLINE = 12;
const HEADER_OUTLINE = 24;

export type MenuBoardSlot = 'header' | 'row1' | 'row2' | 'row3' | 'row4';
export const MENU_BOARD_SLOTS: readonly MenuBoardSlot[] = ['header', 'row1', 'row2', 'row3', 'row4'];

const bottom = (rect: SpriteRect): number => rect.y + rect.height;
const mid = (a: number, b: number): number => Math.round((a + b) / 2);

/** Hit areas in source px (sheet coordinates). */
export const MENU_BOARD_HIT_RECTS: Readonly<Record<MenuBoardSlot, SpriteRect>> = (() => {
  const plankX = ROWS[0].x - PLANK_OUTLINE;
  const plankW = ROWS[0].width + PLANK_OUTLINE * 2;
  const headerBottom = bottom(HEADER) + HEADER_OUTLINE;
  const edges = [
    mid(headerBottom, ROWS[0].y),
    mid(bottom(ROWS[0]), ROWS[1].y),
    mid(bottom(ROWS[1]), ROWS[2].y),
    mid(bottom(ROWS[2]), ROWS[3].y),
    bottom(ROWS[3]) + PLANK_OUTLINE,
  ];
  const row = (index: number): SpriteRect => ({ x: plankX, y: edges[index], width: plankW, height: edges[index + 1] - edges[index] });
  return {
    header: {
      x: HEADER.x - HEADER_OUTLINE,
      y: HEADER.y - HEADER_OUTLINE / 3,
      width: HEADER.width + HEADER_OUTLINE * 2,
      height: edges[0] - (HEADER.y - HEADER_OUTLINE / 3),
    },
    row1: row(0),
    row2: row(1),
    row3: row(2),
    row4: row(3),
  };
})();

export interface NormalizedRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Normalizes a sheet rect to the board frame (0..1 on each axis). */
export function normalizeToBoard(rect: SpriteRect): NormalizedRect {
  return {
    x: (rect.x - FRAME.x) / FRAME.width,
    y: (rect.y - FRAME.y) / FRAME.height,
    width: rect.width / FRAME.width,
    height: rect.height / FRAME.height,
  };
}

export const MENU_BOARD_HITBOXES: Readonly<Record<MenuBoardSlot, NormalizedRect>> = Object.fromEntries(
  MENU_BOARD_SLOTS.map((slot) => [slot, normalizeToBoard(MENU_BOARD_HIT_RECTS[slot])]),
) as Record<MenuBoardSlot, NormalizedRect>;

/**
 * Board sizing. On phones the planks (not the whole frame) fill the screen and
 * the outer posts crop at the edges, keeping rows large enough to tap. The art
 * is never stretched.
 */
export const MENU_BOARD_SIZING = {
  /** Share of the available width the planks should span on narrow screens. */
  plankFill: 0.94,
  /** Plank span as a share of the board frame width. */
  plankShare: (ROWS[0].width + PLANK_OUTLINE * 2) / FRAME.width,
  /** Largest board width (CSS px). */
  maxWidth: 780,
} as const;

const pct = (value: number): string => `${(value * 100).toFixed(3)}%`;

export function menuBoardStyleVars(): string {
  return [
    `--board-aspect:${(FRAME.width / FRAME.height).toFixed(4)}`,
    `--board-plank-fill:${MENU_BOARD_SIZING.plankFill}`,
    `--board-plank-share:${MENU_BOARD_SIZING.plankShare.toFixed(4)}`,
    `--board-max-width:${MENU_BOARD_SIZING.maxWidth}px`,
  ].join(';');
}

export function menuHitboxStyleVars(slot: MenuBoardSlot): string {
  const box = MENU_BOARD_HITBOXES[slot];
  return `--hit-x:${pct(box.x)};--hit-y:${pct(box.y)};--hit-w:${pct(box.width)};--hit-h:${pct(box.height)}`;
}

/** Board crop inside menu-bar.png (the sheet has transparent margins). */
export const MENU_BOARD_FRAME: SpriteRect = FRAME;
