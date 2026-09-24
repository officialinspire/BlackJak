import { afterEach, describe, expect, it } from 'vitest';
import { CARD_THEMES, cardKey } from '../src/data/card-atlas';
import { CARD_THEME_IDS } from '../src/data/visual-atlas';
import { cardMarkup, setActiveCardTheme, spriteInsets } from '../src/ui/card';

const viewBoxOf = (rect: { x: number; y: number; width: number; height: number }) =>
  `viewBox="${rect.x} ${rect.y} ${rect.width} ${rect.height}"`;

afterEach(() => setActiveCardTheme('standard'));

describe('accessible card markup', () => {
  it('exposes visible cards as named playing-card images', () => {
    const markup = cardMarkup({ rank: 'K', suit: 'hearts' });

    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-roledescription="playing card"');
    expect(markup).toContain('aria-label="K of hearts"');
    expect(markup).toContain('data-suit="hearts"');
  });

  it('announces hidden dealer cards without exposing their face', () => {
    const markup = cardMarkup({ rank: 'A', suit: 'spades' }, true);

    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Hidden dealer card"');
    expect(markup).not.toContain('A of spades');
    expect(markup).not.toContain(viewBoxOf(CARD_THEMES.standard.faces['A-spades']));
    expect(markup).toContain(viewBoxOf(CARD_THEMES.standard.back));
  });

  it('describes the House Gold Card rule in its accessible name', () => {
    const markup = cardMarkup({ rank: 'A', suit: 'diamonds' }, false, 0, 'gold');

    expect(markup).toContain('aria-label="Gold Card, counts as Ace, A of diamonds"');
    expect(markup).toContain('gold-card');
  });

  it('keeps the deal animation delay', () => {
    expect(cardMarkup({ rank: '9', suit: 'clubs' }, false, 3)).toContain('--deal-delay:114ms');
  });

  it('renders a hole reveal with simultaneous back and face planes', () => {
    const markup = cardMarkup({ rank: 'A', suit: 'spades' }, false, 0, 'standard', 'standard', {
      id: '4:dealer:dealer:1', state: 'FLIPPING', dealOrder: 3,
    });
    expect(markup).toContain('data-visual-id="4:dealer:dealer:1"');
    expect(markup).toContain('data-motion="FLIPPING"');
    expect(markup).toContain('card-front');
    expect(markup).toContain('card-flip-back');
    expect(markup).toContain(viewBoxOf(CARD_THEMES.standard.faces['A-spades']));
    expect(markup).toContain(viewBoxOf(CARD_THEMES.standard.back));
    expect(markup).toContain('aria-label="A of spades"');
  });
});

describe('themed sprite faces', () => {
  it.each(CARD_THEME_IDS)('%s renders the mapped sprite for the card and its own back', (theme) => {
    const face = cardMarkup({ rank: 'Q', suit: 'clubs' }, false, 0, 'standard', theme);
    expect(face).toContain(viewBoxOf(CARD_THEMES[theme].faces[cardKey({ rank: 'Q', suit: 'clubs' })]));
    expect(face).toContain(`card-theme-${theme}`);
    expect(face).toMatch(/<svg class="atlas-sprite card-sprite" aria-hidden="true"/);

    const back = cardMarkup({ rank: 'Q', suit: 'clubs' }, true, 0, 'standard', theme);
    expect(back).toContain(viewBoxOf(CARD_THEMES[theme].back));
  });

  it('uses the active theme by default', () => {
    setActiveCardTheme('jak');
    expect(cardMarkup({ rank: '2', suit: 'hearts' })).toContain(viewBoxOf(CARD_THEMES.jak.faces['2-hearts']));
  });

  it('decorates, rather than replaces, the themed card for the Gold Card', () => {
    const gold = cardMarkup({ rank: '5', suit: 'spades' }, false, 0, 'gold', 'inspire');
    expect(gold).toContain(viewBoxOf(CARD_THEMES.inspire.faces['5-spades']));
    expect(gold).toContain('gold-card-overlay');
    expect(gold).toContain('>GOLD<');
  });

  it('falls back to the drawn face for flagged sheet cells', () => {
    const markup = cardMarkup({ rank: '7', suit: 'hearts' }, false, 0, 'standard', 'inspire');
    expect(markup).toContain('art-fallback');
    expect(markup).toContain('data-art-issue="7-hearts"');
    expect(markup).not.toContain('atlas-sprite');
    expect(markup).toContain('aria-label="7 of hearts"');
    expect(markup).toContain('♥');
  });

  it('fits sprites into the card box without distortion', () => {
    const narrow = spriteInsets({ x: 0, y: 0, width: 100, height: 182 });
    expect(narrow.y).toBe(0);
    expect(narrow.x).toBeGreaterThan(0);
    const wide = spriteInsets({ x: 0, y: 0, width: 140, height: 182 });
    expect(wide.x).toBe(0);
    expect(wide.y).toBeGreaterThan(0);
  });
});
