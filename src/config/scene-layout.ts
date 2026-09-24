import { ATLAS_SHEETS, TABLE_LAYOUT, type SpriteRect } from '../data/visual-atlas';

/*
 * Game-scene layout constants.
 *
 * The table art (blackjak-table.png) is the scene's base layer. Every gameplay
 * anchor below is normalized to that image (0..1 on each axis), so anchors
 * track the printed felt no matter how large the scene renders. The CSS in
 * src/styles/scene.css reads these through custom properties emitted by
 * sceneStyleVars(); render code never hardcodes coordinates.
 */

const TABLE = ATLAS_SHEETS.table;

const nx = (px: number): number => px / TABLE.width;
const ny = (px: number): number => px / TABLE.height;
const bottomOf = (rect: SpriteRect): number => rect.y + rect.height;
const centerX = (rect: SpriteRect): number => rect.x + rect.width / 2;
const centerY = (rect: SpriteRect): number => rect.y + rect.height / 2;

/** Intrinsic aspect ratio (width / height) of the table image. Never distorted. */
export const SCENE_TABLE_ASPECT = TABLE.width / TABLE.height;

/**
 * The frame height follows the available viewport height, clamped between the
 * table's own aspect (no crop) and these tallest-allowed aspects. On frames
 * taller than the art the table is scaled to cover and its outer decor is
 * cropped at the sides (never stretched); the felt stays visible.
 * Breakpoints live in scene.css.
 */
export const SCENE_TALLEST_FRAME_ASPECT = {
  phone: 0.72,
  tablet: 1,
} as const;

/** Frame height floor so dealer and player cards never crowd on short phones. */
export const SCENE_MIN_FRAME_HEIGHT_PX = 270;

/** Height of Jak's viewport as a share of the table height (it starts at the top edge). */
export const SCENE_NPC_HEIGHT = 0.37;

/** Upper bound for the scene width on desktop/tablet (CSS px). */
export const SCENE_MAX_WIDTH_PX = 1120;

export type SceneAnchorAlign = 'center' | 'bottom';

export interface SceneAnchor {
  /** Normalized x on the table image (0..1). */
  readonly x: number;
  /** Normalized y on the table image (0..1). */
  readonly y: number;
  /** Whether `y` marks the element's vertical center or its bottom edge. */
  readonly align: SceneAnchorAlign;
}

const spots = TABLE_LAYOUT.playerSpots;
const centerSpot = spots[2].rect;
const titleCenter = centerY(TABLE_LAYOUT.title.rect);

export const SCENE_ANCHORS = {
  /** Jak NPC: centered behind the chip tray; the viewport's bottom edge sits behind the dealer's cards. */
  npc: { x: nx(centerX(TABLE_LAYOUT.chipTray.rect)), y: ny(titleCenter + 70), align: 'bottom' },
  /** Dealer hand: on the BLACKJAK title, low enough that Jak's face stays clear above it. */
  dealerHand: { x: 0.5, y: ny(titleCenter), align: 'center' },
  /** Player hands: bottom edge just below the center betting spot. */
  playerHands: { x: nx(centerX(centerSpot)), y: ny(bottomOf(centerSpot) + 40), align: 'bottom' },
} as const satisfies Record<string, SceneAnchor>;

export type SceneAnchorId = keyof typeof SCENE_ANCHORS;

const pct = (value: number): string => `${(value * 100).toFixed(2)}%`;
const kebab = (id: string): string => id.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

/** CSS custom properties consumed by scene.css, emitted once on `.game-scene`. */
export function sceneStyleVars(): string {
  const vars: string[] = [
    `--table-aspect:${SCENE_TABLE_ASPECT.toFixed(4)}`,
    `--frame-tallest-phone:${SCENE_TALLEST_FRAME_ASPECT.phone}`,
    `--frame-tallest-tablet:${SCENE_TALLEST_FRAME_ASPECT.tablet}`,
    `--frame-min-height:${SCENE_MIN_FRAME_HEIGHT_PX}px`,
    `--scene-max-width:${SCENE_MAX_WIDTH_PX}px`,
    `--npc-height:${(SCENE_NPC_HEIGHT * 100).toFixed(2)}%`,
  ];
  for (const [id, anchor] of Object.entries(SCENE_ANCHORS) as [SceneAnchorId, SceneAnchor][]) {
    vars.push(`--anchor-${kebab(id)}-x:${pct(anchor.x)}`, `--anchor-${kebab(id)}-y:${pct(anchor.y)}`);
  }
  return vars.join(';');
}
