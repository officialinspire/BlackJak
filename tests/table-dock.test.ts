import { describe, expect, it } from 'vitest';
import { cardMarkup } from '../src/ui/card';
import { ACTION_SHORTCUTS, DOCK_ACTIONS, dockPhaseFor, tableDockMarkup, type DockInput } from '../src/ui/table-dock';

const sources = import.meta.glob('../src/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const base = (overrides: Partial<DockInput> = {}): DockInput => ({
  phase: 'betting',
  stakeOptions: [10, 25, 50, 100],
  selectedStake: 25,
  chips: 1000,
  maxStake: 500,
  allowed: [],
  house: false,
  formatChips: (value) => String(value),
  ...overrides,
});

describe('dock phase', () => {
  it('derives the phase from round state and chips only', () => {
    expect(dockPhaseFor(null, 1000)).toBe('betting');
    expect(dockPhaseFor('player-turn', 1000)).toBe('playing');
    expect(dockPhaseFor('player-turn', 0)).toBe('playing');
    expect(dockPhaseFor('resolved', 1000)).toBe('resolved');
    expect(dockPhaseFor('resolved', 0)).toBe('broke');
    expect(dockPhaseFor(null, 0)).toBe('broke');
  });
});

describe('table dock markup', () => {
  it('betting: stake chips and a ready Deal with the N shortcut', () => {
    const markup = tableDockMarkup(base());
    for (const stake of ['10', '25', '50', '100', 'max']) expect(markup).toContain(`data-stake="${stake}"`);
    expect(markup).toContain('data-stake="25" aria-pressed="true"');
    expect(markup).toMatch(/data-action="deal" aria-keyshortcuts="N"><strong>Deal</);
    expect(markup).not.toContain('data-action="hit"');
  });

  it('disables stakes larger than the stack', () => {
    const markup = tableDockMarkup(base({ chips: 40, selectedStake: 25 }));
    expect(markup).toMatch(/data-stake="50"[^>]*disabled/);
    expect(markup).toMatch(/data-stake="100"[^>]*disabled/);
    expect(markup).not.toMatch(/data-stake="25"[^>]*disabled/);
  });

  it('playing: all four actions with shortcuts; only allowed ones enabled', () => {
    const markup = tableDockMarkup(base({ phase: 'playing', allowed: ['hit', 'stand'], wager: '25 chips' }));
    for (const action of DOCK_ACTIONS) expect(markup).toContain(`data-action="${action}" aria-label="${action.toUpperCase()}" aria-keyshortcuts="${ACTION_SHORTCUTS[action]}"`);
    expect(markup).toMatch(/data-action="hit"[^>]*"H">/);
    expect(markup).toMatch(/data-action="double"[^>]*disabled/);
    expect(markup).toMatch(/data-action="split"[^>]*disabled/);
    expect(markup).toContain('dock-action-hit is-ready');
    expect(markup).not.toContain('data-action="deal"');
    expect(markup).not.toContain('data-stake=');
  });

  it('resolved: immediate Deal again, plus Run It Back only when offered', () => {
    expect(tableDockMarkup(base({ phase: 'resolved' }))).toContain('<strong>Deal again</strong>');
    expect(tableDockMarkup(base({ phase: 'resolved' }))).not.toContain('run-it-back');
    const house = tableDockMarkup(base({ phase: 'resolved', house: true, runItBack: { tokens: 1, stake: '25 chips' } }));
    expect(house).toContain('data-action="run-it-back"');
    expect(house).toContain('1 token');
  });

  it('broke: a free practice refill, no purchase', () => {
    const markup = tableDockMarkup(base({ phase: 'broke', chips: 0 }));
    expect(markup).toContain('data-action="refill"');
    expect(markup).toContain('No purchase required');
    expect(markup).not.toContain('data-action="deal"');
  });

  it('keeps one fixed dock element with the error as an alert', () => {
    const markup = tableDockMarkup(base({ error: 'Deal a hand first.' }));
    expect(markup.match(/class="table-dock/g)).toHaveLength(1);
    expect(markup).toContain('role="alert"');
  });
});

describe('no real-money UI', () => {
  it('dock copy never offers money features', () => {
    for (const phase of ['betting', 'playing', 'resolved', 'broke'] as const) {
      const markup = tableDockMarkup(base({ phase, house: true, runItBack: { tokens: 1, stake: '25 chips' } })).toLowerCase();
      expect(markup).not.toMatch(/deposit|withdraw|cash ?out|crypto|bitcoin|wallet|real money|\$/);
      expect(markup).toContain('practice');
    }
  });

  it('no UI module links to external operators or payment pages', () => {
    for (const [path, raw] of Object.entries(sources)) {
      if (!path.includes('/ui/')) continue;
      // Scan code and markup, not comments that document the policy itself.
      const source = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      expect(source, path).not.toMatch(/<a\s[^>]*href="https?:/i);
      expect(source.toLowerCase(), path).not.toMatch(/deposit|withdraw|crypto|bitcoin|wallet/);
    }
  });
});

describe('quick card feedback', () => {
  it('settled cards skip the deal-in animation; new cards keep it', () => {
    const fresh = cardMarkup({ rank: '9', suit: 'clubs' }, false, 2);
    const settled = cardMarkup({ rank: '9', suit: 'clubs' }, false, 0, 'standard', undefined, false);
    expect(fresh).not.toContain('is-settled');
    expect(fresh).toContain('--deal-delay:76ms');
    expect(settled).toContain('is-settled');
    expect(cardMarkup({ rank: '9', suit: 'clubs' }, true, 0, 'standard', undefined, false)).toContain('is-settled');
  });
});
