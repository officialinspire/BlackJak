import { describe, expect, it } from 'vitest';
import menuCss from '../src/styles/menu-board.css?raw';
import {
  MENU_BOARD_HITBOXES,
  MENU_BOARD_HIT_RECTS,
  MENU_BOARD_SIZING,
  MENU_BOARD_SLOTS,
  menuBoardStyleVars,
  menuHitboxStyleVars,
} from '../src/config/menu-board-layout';
import { MENU_BAR_LAYOUT, rectContains, rectsOverlap } from '../src/data/visual-atlas';
import { menuBoardMarkup } from '../src/ui/menu-board';
import { escapeIntent, isTableScreen, pauseMenuMarkup, type PauseMenuInput } from '../src/ui/pause-menu';

const pauseInput = (overrides: Partial<PauseMenuInput> = {}): PauseMenuInput => ({
  modeLabel: 'Classic',
  chips: '975',
  rep: 50,
  title: 'Table Scrub',
  handInProgress: true,
  confirmLeave: false,
  deckLabel: 'Standard',
  soundOn: true,
  ...overrides,
});

describe('menu board hit areas', () => {
  it('normalizes every hit area inside the board frame', () => {
    for (const slot of MENU_BOARD_SLOTS) {
      const box = MENU_BOARD_HITBOXES[slot];
      expect(box.x, slot).toBeGreaterThanOrEqual(0);
      expect(box.y, slot).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, slot).toBeLessThanOrEqual(1);
      expect(box.y + box.height, slot).toBeLessThanOrEqual(1);
      expect(rectContains(MENU_BAR_LAYOUT.frame.rect, MENU_BOARD_HIT_RECTS[slot]), slot).toBe(true);
    }
  });

  it('covers the painted face of the plaque and each plank', () => {
    expect(rectContains(MENU_BOARD_HIT_RECTS.header, MENU_BAR_LAYOUT.header.rect)).toBe(true);
    MENU_BAR_LAYOUT.rows.forEach((row, index) => {
      const slot = MENU_BOARD_SLOTS[index + 1];
      expect(rectContains(MENU_BOARD_HIT_RECTS[slot], row.rect), slot).toBe(true);
    });
  });

  it('never overlaps neighbouring targets and stacks top to bottom', () => {
    for (let i = 0; i < MENU_BOARD_SLOTS.length; i += 1) {
      for (let j = i + 1; j < MENU_BOARD_SLOTS.length; j += 1) {
        expect(rectsOverlap(MENU_BOARD_HIT_RECTS[MENU_BOARD_SLOTS[i]], MENU_BOARD_HIT_RECTS[MENU_BOARD_SLOTS[j]])).toBe(false);
      }
    }
    const ys = MENU_BOARD_SLOTS.map((slot) => MENU_BOARD_HITBOXES[slot].y);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
  });

  it('keeps rows at least 24px tall on a 320px phone (WCAG 2.5.8)', () => {
    // Board width on a 320px screen (≈304px usable) with the planks filling the width.
    const boardWidth = (304 * MENU_BOARD_SIZING.plankFill) / MENU_BOARD_SIZING.plankShare;
    const frame = MENU_BAR_LAYOUT.frame.rect;
    const boardHeight = boardWidth * (frame.height / frame.width);
    for (const slot of MENU_BOARD_SLOTS) expect(MENU_BOARD_HITBOXES[slot].height * boardHeight, slot).toBeGreaterThanOrEqual(24);
  });

  it('matches the CSS custom-property contract', () => {
    const emitted = new Set([...`${menuBoardStyleVars()};${menuHitboxStyleVars('row1')}`.matchAll(/(--[a-z-]+):/g)].map((m) => m[1]));
    const consumed = new Set([...menuCss.matchAll(/var\((--(?:board|hit)-[a-z-]+)/g)].map((m) => m[1]));
    for (const name of consumed) expect(emitted.has(name), name).toBe(true);
    for (const name of emitted) expect(consumed.has(name), name).toBe(true);
  });
});

describe('main menu board markup', () => {
  const markup = menuBoardMarkup({
    as: 'nav',
    label: 'BlackJak modes',
    items: [
      { slot: 'header', label: 'Classic BlackJak', attributes: 'data-screen="classic"' },
      { slot: 'row1', label: "Jak's House", attributes: 'data-screen="house"' },
      { slot: 'row2', label: 'Daily Hand', attributes: 'data-screen="daily"' },
      { slot: 'row3', label: 'Stats', attributes: 'data-screen="stats"' },
      { slot: 'row4', label: 'Settings', attributes: 'data-screen="settings"' },
    ],
  });

  it('layers five real buttons over decorative art', () => {
    expect(markup.match(/<button /g)).toHaveLength(5);
    for (const screen of ['classic', 'house', 'daily', 'stats', 'settings']) expect(markup).toContain(`data-screen="${screen}"`);
    expect(markup).toMatch(/class="menu-board-art" aria-hidden="true"/);
    expect(markup).toContain('<nav class="menu-board"');
    expect(markup).toContain('aria-label="BlackJak modes"');
    expect(markup).toContain(">Jak's House<");
  });

  it('positions each button from the normalized hit areas', () => {
    for (const slot of MENU_BOARD_SLOTS) expect(markup).toContain(menuHitboxStyleVars(slot));
  });

  it('shows visible focus and debug hit outlines', () => {
    expect(menuCss).toMatch(/\.menu-board-item:focus-visible\s*{[^}]*outline: 3px solid/);
    expect(menuCss).toMatch(/\.debug-visuals \.menu-board-hit\s*{[^}]*outline:/);
  });
});

describe('pause board', () => {
  it('is a labelled modal dialog with a chips/REP summary', () => {
    const markup = pauseMenuMarkup(pauseInput());
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain('aria-labelledby="pause-title"');
    expect(markup).toContain('<b>975</b> chips');
    expect(markup).toContain('<b>50</b> REP');
  });

  it('offers resume, safe options and main menu', () => {
    const markup = pauseMenuMarkup(pauseInput({ soundOn: false }));
    for (const action of ['resume', 'deck', 'sound', 'menu']) expect(markup).toContain(`data-pause-action="${action}"`);
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).toContain('Deck: Standard');
    expect(markup).not.toContain('data-screen=');
  });

  it('asks for confirmation before leaving a hand in progress', () => {
    expect(pauseMenuMarkup(pauseInput({ confirmLeave: true }))).toContain('Leave hand?');
    expect(pauseMenuMarkup(pauseInput({ confirmLeave: true }))).toContain('data-confirm="true"');
    expect(pauseMenuMarkup(pauseInput({ handInProgress: false }))).not.toContain('Hand in progress');
  });

  it('toggles with Escape only at a table; elsewhere Escape goes back', () => {
    expect(isTableScreen('classic')).toBe(true);
    expect(isTableScreen('house')).toBe(true);
    expect(escapeIntent('classic', false)).toBe('open-pause');
    expect(escapeIntent('house', true)).toBe('close-pause');
    expect(escapeIntent('settings', false)).toBe('back');
    expect(escapeIntent('daily', false)).toBe('back');
    expect(escapeIntent('menu', false)).toBe('none');
  });

  it('respects reduced motion for the hanging-sign drop', () => {
    const reduced = menuCss.slice(menuCss.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toContain('.pause-sign { animation: none; }');
  });
});
