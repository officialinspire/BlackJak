import type { Card } from '../game';

const suitSymbol: Record<Card['suit'], string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

export function cardMarkup(card: Card, hidden = false, dealIndex = 0): string {
  const delay = Math.min(Math.max(dealIndex, 0), 8) * 38;

  if (hidden) {
    return `
      <div class="playing-card card-back" style="--deal-delay:${delay}ms" aria-label="Hidden dealer card">
        <div class="card-back-frame" aria-hidden="true">
          <span class="back-monogram">BJ</span>
          <span class="back-wordmark">BLACKJAK</span>
        </div>
      </div>`;
  }

  const red = card.suit === 'hearts' || card.suit === 'diamonds';
  const suit = suitSymbol[card.suit];
  return `
    <div class="playing-card ${red ? 'red-suit' : 'black-suit'}" style="--deal-delay:${delay}ms" aria-label="${card.rank} of ${card.suit}">
      <span class="card-corner card-corner-top" aria-hidden="true"><b>${card.rank}</b><i>${suit}</i></span>
      <span class="card-center-suit" aria-hidden="true">${suit}</span>
      <span class="card-corner card-corner-bottom" aria-hidden="true"><b>${card.rank}</b><i>${suit}</i></span>
    </div>
  `;
}
