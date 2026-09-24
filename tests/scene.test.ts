import { describe, expect, it } from 'vitest';
import sceneCss from '../src/styles/scene.css?raw';
import { BLACKJAK_ASSET_URLS } from '../src/assets/blackjak-assets';
import {
  SCENE_ANCHORS,
  SCENE_NPC_HEIGHT,
  SCENE_TABLE_ASPECT,
  SCENE_TALLEST_FRAME_ASPECT,
  sceneStyleVars,
  type SceneAnchorId,
} from '../src/config/scene-layout';
import { ATLAS_SHEETS, TABLE_LAYOUT } from '../src/data/visual-atlas';
import { gameSceneMarkup, type GameSceneSlots } from '../src/ui/scene';

const slots = (mode: GameSceneSlots['mode']): GameSceneSlots => ({
  mode,
  label: `${mode} table`,
  hud: '<div id="hud-slot"></div>',
  npc: '<div id="npc-slot"></div>',
  dealerHand: '<div id="dealer-slot"></div>',
  playerHands: '<div id="player-slot"></div>',
  dialogue: '<div id="dialogue-slot"></div>',
  overlay: '<div id="overlay-slot"></div>',
});

const structure = (markup: string): string[] =>
  [...markup.matchAll(/class="([^"]+)"/g)].map((match) => match[1].replace(/scene-(classic|house)/, 'scene-MODE'));

describe('scene layout constants', () => {
  it('uses the real table aspect ratio', () => {
    expect(SCENE_TABLE_ASPECT).toBeCloseTo(ATLAS_SHEETS.table.width / ATLAS_SHEETS.table.height, 6);
    for (const aspect of Object.values(SCENE_TALLEST_FRAME_ASPECT)) {
      expect(aspect).toBeGreaterThan(0.5);
      expect(aspect).toBeLessThanOrEqual(SCENE_TABLE_ASPECT);
    }
  });

  it('keeps every anchor inside the normalized table', () => {
    for (const anchor of Object.values(SCENE_ANCHORS)) {
      expect(anchor.x).toBeGreaterThan(0);
      expect(anchor.x).toBeLessThan(1);
      expect(anchor.y).toBeGreaterThan(0);
      expect(anchor.y).toBeLessThan(1);
    }
  });

  it('derives anchors from the measured table art and stacks them top to bottom', () => {
    const { chipTray, title, playerSpots } = TABLE_LAYOUT;
    const h = ATLAS_SHEETS.table.height;
    const w = ATLAS_SHEETS.table.width;
    const centerSpot = playerSpots[2].rect;

    expect(SCENE_ANCHORS.playerHands.x).toBeCloseTo((centerSpot.x + centerSpot.width / 2) / w, 6);
    expect(SCENE_ANCHORS.playerHands.y).toBeGreaterThan((centerSpot.y + centerSpot.height) / h);
    expect(SCENE_ANCHORS.dealerHand.y).toBeGreaterThan((chipTray.rect.y + chipTray.rect.height) / h);
    expect(SCENE_ANCHORS.dealerHand.y).toBeLessThan((title.rect.y + title.rect.height) / h);

    const order: SceneAnchorId[] = ['dealerHand', 'playerHands'];
    const ys = order.map((id) => SCENE_ANCHORS[id].y);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);

    // Jak's viewport starts at the table's top edge and ends behind the dealer's cards.
    expect(SCENE_ANCHORS.npc.align).toBe('bottom');
    expect(SCENE_ANCHORS.npc.y).toBeGreaterThan(SCENE_ANCHORS.dealerHand.y);
    expect(SCENE_ANCHORS.npc.y).toBeLessThan(SCENE_ANCHORS.playerHands.y);
    expect(SCENE_ANCHORS.npc.y - SCENE_NPC_HEIGHT).toBeGreaterThanOrEqual(-0.01);
  });

  it('emits a custom property for every anchor and scene.css consumes only emitted vars', () => {
    const vars = sceneStyleVars();
    const emitted = new Set([...vars.matchAll(/(--[a-z-]+):/g)].map((match) => match[1]));
    for (const id of Object.keys(SCENE_ANCHORS)) {
      const kebab = id.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
      expect(emitted.has(`--anchor-${kebab}-x`)).toBe(true);
      expect(emitted.has(`--anchor-${kebab}-y`)).toBe(true);
    }

    const locallyDefined = new Set([...sceneCss.matchAll(/(--[a-z-]+)\s*:/g)].map((match) => match[1]));
    const layoutVar = /^--(anchor|table|frame|scene|npc)-/;
    const consumed = [...sceneCss.matchAll(/var\((--[a-z-]+)/g)].map((match) => match[1]).filter((name) => layoutVar.test(name));
    expect(consumed.length).toBeGreaterThan(5);
    for (const name of consumed) {
      expect(emitted.has(name) || locallyDefined.has(name), `${name} is neither emitted nor defined in scene.css`).toBe(true);
    }
    for (const name of emitted) expect(consumed, `${name} is emitted but unused`).toContain(name);
  });
});

describe('game scene component', () => {
  it('stacks table, npc, cards, ui layers with the HUD first in reading order', () => {
    const markup = gameSceneMarkup(slots('classic'));
    const at = (needle: string) => markup.indexOf(needle);

    expect(at('scene-hud')).toBeLessThan(at('scene-table'));
    expect(at('scene-table')).toBeLessThan(at('scene-npc'));
    expect(at('scene-npc')).toBeLessThan(at('scene-cards'));
    expect(at('scene-cards')).toBeLessThan(at('scene-ui'));
    // Dialogue/status bar follows the table frame.
    expect(at('scene-ui')).toBeLessThan(at('scene-dialogue-bar'));
    expect(at('scene-dialogue-bar')).toBeLessThan(at('id="dialogue-slot"'));
    for (const id of ['hud', 'npc', 'dealer', 'player', 'dialogue', 'overlay']) expect(markup).toContain(`id="${id}-slot"`);
  });

  it('uses blackjak-table.png as a decorative base image', () => {
    const markup = gameSceneMarkup(slots('classic'));
    expect(markup).toContain(`src="${BLACKJAK_ASSET_URLS.table}"`);
    expect(markup).toMatch(/<img class="scene-layer scene-table"[^>]*alt=""[^>]*aria-hidden="true"/);
    expect(markup).toContain('aria-label="classic table"');
  });

  it('renders Classic and Jak’s House with the identical scene structure', () => {
    const classic = gameSceneMarkup(slots('classic'));
    const house = gameSceneMarkup(slots('house'));
    expect(structure(house)).toEqual(structure(classic));
    expect(classic).toContain('data-scene-mode="classic"');
    expect(house).toContain('data-scene-mode="house"');
  });

  it('carries layout constants as custom properties instead of inline coordinates', () => {
    const markup = gameSceneMarkup(slots('house'));
    expect(markup).toContain(`style="${sceneStyleVars()}"`);
    expect(markup).not.toMatch(/(left|top|bottom):\s*\d/);
  });
});
