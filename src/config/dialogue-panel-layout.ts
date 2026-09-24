import { ATLAS_SHEETS, DIALOGUE_BAR_LAYOUT } from '../data/visual-atlas';

/*
 * DialogueStatusPanel layout constants, all derived from the measured
 * dialogue-status-bar.png regions (DIALOGUE_BAR_LAYOUT). They are emitted as
 * CSS custom properties by dialoguePanelStyleVars(); dialogue-panel.css holds
 * no image coordinates of its own.
 *
 * The wooden frame is rendered as a nine-slice (CSS border-image): corners
 * keep their rivets/stickers undistorted, edges stretch along the plank grain,
 * and the recessed center is cover-cropped (never squashed). The black matte
 * around the art, including stray light marks along the top edge, is hidden with
 * clip-path.
 */

const SHEET = ATLAS_SHEETS.dialogueBar;
const FRAME = DIALOGUE_BAR_LAYOUT.frame.rect;
const CONTENT = DIALOGUE_BAR_LAYOUT.content.rect;

export interface Edges {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

/** Nine-slice cut lines, in source px from each image edge: the recessed text panel's outline. */
export const DIALOGUE_PANEL_SLICE: Edges = {
  top: CONTENT.y,
  right: SHEET.width - (CONTENT.x + CONTENT.width),
  bottom: SHEET.height - (CONTENT.y + CONTENT.height),
  left: CONTENT.x,
};

/** Black matte around the wooden frame (source px), clipped away. */
export const DIALOGUE_PANEL_MATTE: Edges = {
  top: FRAME.y,
  right: SHEET.width - (FRAME.x + FRAME.width),
  bottom: SHEET.height - (FRAME.y + FRAME.height),
  left: FRAME.x,
};

/** Outer corner radius of the wooden frame (source px). */
export const DIALOGUE_PANEL_CORNER_RADIUS = 44;

/**
 * Rendered CSS px per source px. The fluid value is a share of the scene width
 * (cqi); min/max keep the frame legible on 320px phones and restrained on desktop.
 */
export const DIALOGUE_PANEL_SCALE = { min: 0.12, fluid: 0.034, max: 0.19 } as const;

/** Widest the panel grows (CSS px) so long lines stay readable. */
export const DIALOGUE_PANEL_MAX_WIDTH_PX = 760;

/** How far the panel tucks up over the table frame's bottom rail (CSS px). */
export const DIALOGUE_PANEL_OVERLAP_PX = 14;

export function dialoguePanelStyleVars(frameUrl: string): string {
  const edge = (prefix: string, edges: Edges): string[] =>
    (Object.entries(edges) as [keyof Edges, number][]).map(([side, value]) => `--${prefix}-${side}:${value}`);

  return [
    `--dlg-frame-url:url(${frameUrl})`,
    ...edge('dlg-slice', DIALOGUE_PANEL_SLICE),
    ...edge('dlg-matte', DIALOGUE_PANEL_MATTE),
    `--dlg-radius:${DIALOGUE_PANEL_CORNER_RADIUS}`,
    `--dlg-scale-min:${DIALOGUE_PANEL_SCALE.min}px`,
    `--dlg-scale-fluid:${DIALOGUE_PANEL_SCALE.fluid}cqi`,
    `--dlg-scale-max:${DIALOGUE_PANEL_SCALE.max}px`,
    `--dlg-max-width:${DIALOGUE_PANEL_MAX_WIDTH_PX}px`,
    `--dlg-overlap:${DIALOGUE_PANEL_OVERLAP_PX}px`,
  ].join(';');
}
