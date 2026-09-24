import inspireLogoUrl from '../../logo.png';

export type GameFooterVariant = 'default' | 'compact';

const INSPIRE_URL = 'https://www.inspireclothing.art/';

export function gameFooterMarkup(variant: GameFooterVariant = 'default'): string {
  return `
    <footer class="game-footer${variant === 'compact' ? ' game-footer-compact' : ''}">
      <a class="game-footer-link" href="${INSPIRE_URL}" target="_blank" rel="noopener noreferrer" aria-label="Visit OFFICIAL INSPIRE at www.inspireclothing.art (opens in a new tab)">
        <img class="game-footer-logo" src="${inspireLogoUrl}" alt="" aria-hidden="true" />
        <span class="game-footer-copy"><strong>OFFICIAL INSPIRE</strong><span>www.inspireclothing.art</span></span>
      </a>
    </footer>`;
}

