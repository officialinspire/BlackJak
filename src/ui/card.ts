import { cardArtIssue, cardBackSprite, cardFaceSprite, cardThemeSheet, DEFAULT_CARD_THEME } from '../data/card-atlas';
import type { CardThemeId, SpriteRect } from '../data/visual-atlas';
import type { Card } from '../game';
import { atlasSpriteMarkup } from './atlas';

const suitSymbol: Record<Card['suit'], string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

export type CardVariant = 'standard' | 'gold';

/** Width / height of the card box every layout rule is written against. */
export const CARD_BOX_ASPECT = 0.69;

let activeTheme: CardThemeId = DEFAULT_CARD_THEME;

/** Deck theme used when cardMarkup() is called without an explicit theme. */
export function setActiveCardTheme(theme: CardThemeId): void {
  activeTheme = theme;
}

export function getActiveCardTheme(): CardThemeId {
  return activeTheme;
}

/**
 * Sprite cells vary in shape (pip cards are narrower than court cards). The
 * sprite is fitted, undistorted, inside the fixed card box; these insets
 * describe where the art actually sits so overlays (Gold Card) can hug it.
 */
export function spriteInsets(rect: SpriteRect): { x: number; y: number } {
  const aspect = rect.width / rect.height;
  return aspect < CARD_BOX_ASPECT
    ? { x: ((1 - aspect / CARD_BOX_ASPECT) / 2) * 100, y: 0 }
    : { x: 0, y: ((1 - CARD_BOX_ASPECT / aspect) / 2) * 100 };
}

function spriteStyle(rect: SpriteRect, delay: number): string {
  const inset = spriteInsets(rect);
  return `--deal-delay:${delay}ms;--sprite-inset-x:${inset.x.toFixed(2)}%;--sprite-inset-y:${inset.y.toFixed(2)}%`;
}

function cssFaceMarkup(card: Card): string {
  const suit = suitSymbol[card.suit];
  return `
      <span class="card-corner card-corner-top" aria-hidden="true"><b>${card.rank}</b><i>${suit}</i></span>
      <span class="card-center-suit" aria-hidden="true">${suit}</span>
      <span class="card-corner card-corner-bottom" aria-hidden="true"><b>${card.rank}</b><i>${suit}</i></span>`;
}

export function cardMarkup(
  card: Card,
  hidden = false,
  dealIndex = 0,
  variant: CardVariant = 'standard',
  theme: CardThemeId = activeTheme,
  /** true: deal in · false: already on screen (no animation) · 'flip': hole card turning over. */
  animate: boolean | 'flip' = true,
): string {
  const delay = Math.min(Math.max(dealIndex, 0), 8) * 38;
  const settled = animate === 'flip' ? ' is-flip' : animate ? '' : ' is-settled';
  const sheet = cardThemeSheet(theme);

  if (hidden) {
    const back = cardBackSprite(theme);
    return `
      <div class="playing-card card-back sprite-card card-theme-${theme}${settled}" role="img" aria-roledescription="playing card" style="${spriteStyle(back, delay)}" aria-label="Hidden dealer card">
        ${atlasSpriteMarkup(sheet, back, { className: 'card-sprite' })}
      </div>`;
  }

  const red = card.suit === 'hearts' || card.suit === 'diamonds';
  const gold = variant === 'gold';
  const label = `${gold ? 'Gold Card, counts as Ace, ' : ''}${card.rank} of ${card.suit}`;
  const face = cardFaceSprite(theme, card);
  const suitClass = red ? 'red-suit' : 'black-suit';
  const goldLabel = gold ? '<span class="gold-card-label" aria-hidden="true">GOLD</span>' : '';

  if (!face) {
    // Flagged sheet cell (see CARD_ART_ISSUES): draw the card instead of showing wrong art.
    const issue = cardArtIssue(theme, card);
    return `
    <div class="playing-card ${suitClass} ${gold ? 'gold-card' : ''} card-theme-${theme} art-fallback${settled}" role="img" aria-roledescription="playing card" data-suit="${card.suit}" data-art-issue="${issue?.key ?? ''}" style="--deal-delay:${delay}ms" aria-label="${label}">
      ${goldLabel}
      ${cssFaceMarkup(card)}
    </div>
  `;
  }

  return `
    <div class="playing-card sprite-card ${suitClass} ${gold ? 'gold-card' : ''} card-theme-${theme}${settled}" role="img" aria-roledescription="playing card" data-suit="${card.suit}" data-card="${card.rank}-${card.suit}" style="${spriteStyle(face, delay)}" aria-label="${label}">
      ${atlasSpriteMarkup(sheet, face, { className: 'card-sprite' })}
      ${gold ? '<span class="gold-card-overlay" aria-hidden="true"></span>' : ''}
      ${goldLabel}
    </div>
  `;
}
