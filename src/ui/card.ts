import type { Card } from '../game';

const suitSymbol: Record<Card['suit'], string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

export function cardMarkup(card: Card, hidden = false): string {
  if (hidden) {
    return `<div class="playing-card card-back" aria-label="Hidden dealer card"><span>BLACKJAK</span></div>`;
  }

  const red = card.suit === 'hearts' || card.suit === 'diamonds';
  return `
    <div class="playing-card ${red ? 'red-suit' : 'black-suit'}" aria-label="${card.rank} of ${card.suit}">
      <span class="card-rank">${card.rank}</span>
      <span class="card-suit" aria-hidden="true">${suitSymbol[card.suit]}</span>
    </div>
  `;
}
