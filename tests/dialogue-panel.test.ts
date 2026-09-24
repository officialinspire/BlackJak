import { describe, expect, it } from 'vitest';
import panelCss from '../src/styles/dialogue-panel.css?raw';
import { BLACKJAK_ASSET_URLS } from '../src/assets/blackjak-assets';
import {
  DIALOGUE_PANEL_MATTE,
  DIALOGUE_PANEL_SCALE,
  DIALOGUE_PANEL_SLICE,
  dialoguePanelStyleVars,
} from '../src/config/dialogue-panel-layout';
import { ATLAS_SHEETS, DIALOGUE_BAR_LAYOUT } from '../src/data/visual-atlas';
import { dialoguePanelMarkup, type DialoguePanelInput } from '../src/ui/dialogue-panel';

const input = (overrides: Partial<DialoguePanelInput> = {}): DialoguePanelInput => ({
  speaker: 'JAK',
  context: 'HOUSE DEALER',
  line: 'Cards are honest. People get creative.',
  event: 'game_start',
  status: { tone: 'idle', text: 'Choose a stake and deal your first hand.' },
  ...overrides,
});

describe('dialogue panel layout constants', () => {
  it('derives nine-slice cut lines from the measured text-panel region', () => {
    const sheet = ATLAS_SHEETS.dialogueBar;
    const content = DIALOGUE_BAR_LAYOUT.content.rect;
    expect(DIALOGUE_PANEL_SLICE.left).toBe(content.x);
    expect(DIALOGUE_PANEL_SLICE.top).toBe(content.y);
    expect(sheet.width - DIALOGUE_PANEL_SLICE.right).toBe(content.x + content.width);
    expect(sheet.height - DIALOGUE_PANEL_SLICE.bottom).toBe(content.y + content.height);
    expect(DIALOGUE_PANEL_SLICE.left + DIALOGUE_PANEL_SLICE.right).toBeLessThan(sheet.width);
    expect(DIALOGUE_PANEL_SLICE.top + DIALOGUE_PANEL_SLICE.bottom).toBeLessThan(sheet.height);
  });

  it('clips only the matte, which lies inside every slice', () => {
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      expect(DIALOGUE_PANEL_MATTE[side]).toBeGreaterThan(0);
      expect(DIALOGUE_PANEL_MATTE[side]).toBeLessThan(DIALOGUE_PANEL_SLICE[side]);
    }
  });

  it('keeps the scale range sane', () => {
    expect(DIALOGUE_PANEL_SCALE.min).toBeLessThan(DIALOGUE_PANEL_SCALE.max);
    expect(DIALOGUE_PANEL_SLICE.top * DIALOGUE_PANEL_SCALE.min).toBeGreaterThanOrEqual(12);
    expect(DIALOGUE_PANEL_SLICE.top * DIALOGUE_PANEL_SCALE.max).toBeLessThanOrEqual(30);
  });

  it('matches the CSS custom-property contract both ways', () => {
    const emitted = new Set([...dialoguePanelStyleVars('x.png').matchAll(/(--[a-z-]+):/g)].map((m) => m[1]));
    const defined = new Set([...panelCss.matchAll(/(--dlg-[a-z-]+)\s*:/g)].map((m) => m[1]));
    const consumed = new Set([...panelCss.matchAll(/var\((--dlg-[a-z-]+)/g)].map((m) => m[1]));
    for (const name of consumed) expect(emitted.has(name) || defined.has(name), name).toBe(true);
    const usedElsewhere = new Set(['--dlg-overlap', '--dlg-max-width']);
    for (const name of emitted) expect(consumed.has(name) || usedElsewhere.has(name), name).toBe(true);
  });

  it('writes no raw image coordinates into the stylesheet', () => {
    for (const value of [...Object.values(DIALOGUE_PANEL_SLICE), ...Object.values(DIALOGUE_PANEL_MATTE)]) {
      expect(panelCss).not.toMatch(new RegExp(`\\b${value}px\\b`));
    }
  });
});

describe('DialogueStatusPanel markup', () => {
  it('uses the wooden frame art only as decoration', () => {
    const markup = dialoguePanelMarkup(input());
    expect(markup).toContain(`--dlg-frame-url:url(${BLACKJAK_ASSET_URLS.dialogueBar})`);
    expect(markup).toMatch(/class="dialogue-panel-wood" aria-hidden="true"/);
    expect(markup).toContain('preserveAspectRatio="xMidYMid slice"');
  });

  it('keeps speaker, context, line and status as semantic text', () => {
    const markup = dialoguePanelMarkup(input());
    expect(markup).toContain('<b>JAK</b><span>HOUSE DEALER</span>');
    expect(markup).toContain('Cards are honest. People get creative.</p>');
    expect(markup).toContain('Choose a stake and deal your first hand.');
    expect(markup).toContain('data-event="game_start"');
  });

  it('has exactly one live region, and the dialogue line is not live', () => {
    const markup = dialoguePanelMarkup(input({
      status: { tone: 'win', title: 'PAID', text: '+25 chips', tags: ['+50 REP'] },
    }));
    expect(markup.match(/aria-live=/g)).toHaveLength(1);
    expect(markup.match(/role="status"/g)).toHaveLength(1);
    const live = markup.slice(markup.indexOf('role="status"'));
    expect(live).toContain('<strong>PAID</strong>');
    expect(live).toContain('+50 REP');
    expect(live).not.toContain('Cards are honest');
    expect(markup).toContain('tone-win');
  });

  it('escapes text so dialogue can never inject markup', () => {
    const markup = dialoguePanelMarkup(input({ line: '<img src=x onerror=alert(1)> & "quotes"' }));
    expect(markup).toContain('&lt;img src=x onerror=alert(1)&gt; &amp; &quot;quotes&quot;');
    expect(markup).not.toContain('<img');
  });

  it('omits empty tags and supports House context', () => {
    const markup = dialoguePanelMarkup(input({ house: true, context: 'HOUSE RULES ACTIVE', status: { tone: 'loss', title: 'BUSTED', text: '-25 chips', tags: ['', 'RUN IT BACK TOKEN EARNED'] } }));
    expect(markup.match(/dialogue-panel-tag/g)).toHaveLength(1);
    expect(markup).toContain('is-house');
  });

  it('respects reduced motion', () => {
    const reduced = panelCss.slice(panelCss.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toContain('animation: none');
  });

  it('is non-blocking: no focusable or interactive elements, nothing to dismiss', () => {
    const markup = dialoguePanelMarkup(input({ line: 'x'.repeat(400) }));
    expect(markup).not.toMatch(/<button|<a |tabindex|role="dialog"|aria-modal/);
  });
});
