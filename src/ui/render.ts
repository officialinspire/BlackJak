import { APP_NAME, APP_TAGLINE, DEFAULT_CHIPS, DEFAULT_REP } from '../config/constants';
import { allowedActions, evaluateHand, performAction, startRound, type PlayerAction, type RoundState } from '../game';
import type { AppScreen } from '../types/app';
import { cardMarkup } from './card';

interface AppModel {
  screen: AppScreen;
  round: RoundState | null;
  chips: number;
  rep: number;
  error: string | null;
}

const model: AppModel = {
  screen: 'menu',
  round: null,
  chips: DEFAULT_CHIPS,
  rep: DEFAULT_REP,
  error: null,
};

const app = (): HTMLElement => {
  const root = document.querySelector<HTMLElement>('#app');
  if (!root) throw new Error('App root #app was not found.');
  return root;
};

const button = (label: string, screen: AppScreen, disabled = false): string =>
  `<button class="menu-button" data-screen="${screen}" ${disabled ? 'disabled aria-disabled="true"' : ''}>${label}</button>`;

function menuMarkup(): string {
  return `
    <main id="app-main" class="screen menu-screen">
      <section class="brand-lockup" aria-labelledby="game-title">
        <p class="eyebrow">OFFICIAL INSPIRE PRESENTS</p>
        <h1 id="game-title">${APP_NAME}</h1>
        <p class="tagline">${APP_TAGLINE}</p>
      </section>
      <nav class="menu-grid" aria-label="BlackJak modes">
        ${button('Classic BlackJak', 'classic')}
        ${button("Jak's House", 'house')}
        ${button('Stats', 'stats')}
        ${button('Settings', 'settings')}
      </nav>
      <p class="fine-print">Fictional chips only. No real-money wagering.</p>
    </main>`;
}

function placeholderMarkup(title: string, copy: string): string {
  return `
    <main id="app-main" class="screen panel-screen">
      <button class="back-button" data-screen="menu">← Menu</button>
      <section class="glass-panel">
        <p class="eyebrow">COMING IN A LATER PHASE</p>
        <h1>${title}</h1>
        <p>${copy}</p>
      </section>
    </main>`;
}

function classicMarkup(): string {
  const round = model.round;
  const dealerCards = round?.dealer ?? [];
  const activeHand = round?.hands[round.activeHandIndex];
  const playerCards = activeHand?.cards ?? [];
  const playerTotal = playerCards.length ? evaluateHand(playerCards).total : '—';
  const revealDealer = round?.phase === 'resolved';
  const dealerTotal = dealerCards.length ? (revealDealer ? evaluateHand(dealerCards).total : '?') : '—';
  const valid = round?.phase === 'player-turn' && activeHand ? allowedActions(activeHand, model.chips) : [];

  return `
    <main id="app-main" class="screen table-screen">
      <header class="table-header">
        <button class="back-button" data-screen="menu">← Menu</button>
        <div class="hud" aria-label="Player resources"><span>CHIPS <strong>${model.chips}</strong></span><span>REP <strong>${model.rep}</strong></span></div>
      </header>

      <section class="table" aria-live="polite">
        <div class="hand-zone dealer-zone">
          <div class="zone-label"><span>DEALER</span><strong>${dealerTotal}</strong></div>
          <div class="cards">${dealerCards.map((card, index) => cardMarkup(card, index === 1 && !revealDealer)).join('')}</div>
        </div>

        <div class="table-mark">BLACK<span>JAK</span></div>

        <div class="hand-zone player-zone">
          <div class="zone-label"><span>YOUR HAND</span><strong>${playerTotal}</strong></div>
          <div class="cards">${playerCards.map((card) => cardMarkup(card)).join('')}</div>
        </div>
      </section>

      <section class="developer-harness" aria-label="Blackjack developer harness">
        <p class="status-line">${statusText(round)}</p>
        ${model.error ? `<p class="error-line" role="alert">${model.error}</p>` : ''}
        <div class="action-bar">
          <button data-action="deal">${round ? 'New Test Hand' : 'Deal Test Hand'}</button>
          ${(['hit', 'stand', 'double', 'split'] as PlayerAction[])
            .map((action) => `<button data-action="${action}" ${valid.includes(action) ? '' : 'disabled'}>${action.toUpperCase()}</button>`)
            .join('')}
        </div>
        <p class="dev-note">Developer harness: rules engine only. Betting/persistence/gameplay economy arrive in Prompt 2.</p>
      </section>
    </main>`;
}

function statusText(round: RoundState | null): string {
  if (!round) return 'Rules engine ready. Deal a deterministic testable round.';
  if (round.phase === 'resolved') {
    return round.results.map((result) => `${result.handId}: ${result.outcome.toUpperCase()} (${result.net >= 0 ? '+' : ''}${result.net})`).join(' · ');
  }
  return `Phase: ${round.phase.replace('-', ' ')} · Deck: ${round.deck.length} cards`;
}

function render(): void {
  switch (model.screen) {
    case 'menu':
      app().innerHTML = menuMarkup();
      break;
    case 'classic':
      app().innerHTML = classicMarkup();
      break;
    case 'house':
      app().innerHTML = placeholderMarkup("Jak's House", 'Arcade modifiers stay isolated from Classic BlackJak and arrive in a later phase.');
      break;
    case 'stats':
      app().innerHTML = placeholderMarkup('Stats', 'Persistent wins, losses, blackjacks, streaks, REP, and achievements will live here.');
      break;
    case 'settings':
      app().innerHTML = placeholderMarkup('Settings', 'Audio, haptics, motion, accessibility, and gameplay preferences will live here.');
      break;
  }

  bindEvents();
}

function bindEvents(): void {
  document.querySelectorAll<HTMLElement>('[data-screen]').forEach((element) => {
    element.addEventListener('click', () => {
      const screen = element.dataset.screen as AppScreen | undefined;
      if (!screen) return;
      model.screen = screen;
      model.error = null;
      render();
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((element) => {
    element.addEventListener('click', () => {
      const action = element.dataset.action;
      model.error = null;
      try {
        if (action === 'deal') {
          model.round = startRound(25);
        } else if (model.round && action) {
          performAction(model.round, action as PlayerAction, model.chips);
        }
      } catch (error) {
        model.error = error instanceof Error ? error.message : 'Unexpected game error.';
      }
      render();
    });
  });
}

export function initializeUI(): void {
  render();
}
