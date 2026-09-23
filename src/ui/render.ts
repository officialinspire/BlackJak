import { APP_NAME, APP_TAGLINE, MAX_STAKE, STAKE_OPTIONS } from '../config/constants';
import {
  allowedActions,
  evaluateHand,
  getActiveHand,
  performAction,
  refillPracticeChips,
  reserveStake,
  settleResults,
  selectDialogue,
  startRound,
  type DialogueEvent,
  type DialogueMemory,
  type DialogueSelection,
  type PlayerAction,
  type PlayerHand,
  type RoundState,
} from '../game';
import { loadProfile, saveProfile } from '../storage/profile';
import type { AppScreen } from '../types/app';
import type { PlayerProfile } from '../types/profile';
import { cardMarkup } from './card';

interface AppModel {
  screen: AppScreen;
  round: RoundState | null;
  profile: PlayerProfile;
  selectedStake: number;
  error: string | null;
  commentary: DialogueSelection;
  dialogueMemory: DialogueMemory;
  winStreak: number;
  lossStreak: number;
}

type RoundTone = 'idle' | 'playing' | 'blackjack' | 'win' | 'loss' | 'push' | 'mixed';

const initialProfile = loadProfile();
const initialDialogue = selectDialogue(initialProfile.stats.totalHands > 0 ? 'return_player' : 'game_start');

const model: AppModel = {
  screen: 'menu',
  round: null,
  profile: initialProfile,
  selectedStake: initialProfile.chips > 0 ? Math.min(25, initialProfile.chips) : 0,
  error: null,
  commentary: initialDialogue.selection,
  dialogueMemory: initialDialogue.memory,
  winStreak: 0,
  lossStreak: 0,
};

const app = (): HTMLElement => {
  const root = document.querySelector<HTMLElement>('#app');
  if (!root) throw new Error('App root #app was not found.');
  return root;
};

const button = (label: string, screen: AppScreen): string =>
  `<button class="menu-button" data-screen="${screen}">${label}</button>`;

const formatChips = (value: number): string =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);

function persistProfile(profile: PlayerProfile): void {
  model.profile = profile;
  saveProfile(profile);
}

function say(event: DialogueEvent): void {
  const next = selectDialogue(event, model.dialogueMemory);
  model.commentary = next.selection;
  model.dialogueMemory = next.memory;
}

function normalizedStake(): number {
  if (model.profile.chips <= 0) return 0;
  if (model.selectedStake > 0 && model.selectedStake <= model.profile.chips) return model.selectedStake;

  const affordablePreset = [...STAKE_OPTIONS].reverse().find((stake) => stake <= model.profile.chips);
  model.selectedStake = affordablePreset ?? Math.min(model.profile.chips, MAX_STAKE);
  return model.selectedStake;
}

function roundTone(round: RoundState | null): RoundTone {
  if (!round) return 'idle';
  if (round.phase !== 'resolved') return 'playing';

  const outcomes = new Set(round.results.map((result) => result.outcome));
  if (outcomes.size !== 1) return 'mixed';

  const outcome = round.results[0]?.outcome;
  if (outcome === 'blackjack' || outcome === 'win' || outcome === 'loss' || outcome === 'push') return outcome;
  return 'mixed';
}

function updateResultStreaks(round: RoundState): void {
  const allWins = round.results.length > 0 && round.results.every((result) => result.outcome === 'win' || result.outcome === 'blackjack');
  const allLosses = round.results.length > 0 && round.results.every((result) => result.outcome === 'loss');

  if (allWins) {
    model.winStreak += 1;
    model.lossStreak = 0;
  } else if (allLosses) {
    model.lossStreak += 1;
    model.winStreak = 0;
  } else {
    model.winStreak = 0;
    model.lossStreak = 0;
  }
}

function resolutionDialogueEvent(round: RoundState): DialogueEvent {
  const dealer = evaluateHand(round.dealer);
  const splitRound = round.hands.length > 1;
  const allWins = round.results.every((result) => result.outcome === 'win' || result.outcome === 'blackjack');
  const allLosses = round.results.every((result) => result.outcome === 'loss');

  if (splitRound && allWins) return 'split_sweep';
  if (splitRound && allLosses) return 'split_disaster';
  if (round.results.some((result) => result.outcome === 'blackjack')) return 'player_blackjack';
  if (dealer.isBlackjack && allLosses) return 'dealer_blackjack';

  const doubledHand = round.hands.find((hand) => hand.doubled);
  if (doubledHand) {
    const doubledResult = round.results.find((result) => result.handId === doubledHand.id);
    if (doubledResult?.outcome === 'win' || doubledResult?.outcome === 'blackjack') return 'double_win';
    if (doubledResult?.outcome === 'loss') return 'double_loss';
  }

  if (dealer.isBust && round.results.some((result) => result.outcome === 'win')) return 'dealer_bust';
  if (allLosses && round.hands.some((hand) => evaluateHand(hand.cards).isBust)) return 'player_bust';
  if (model.winStreak >= 3) return 'winning_streak';
  if (model.lossStreak >= 3) return 'losing_streak';
  if (round.results.every((result) => result.outcome === 'push')) return 'push';
  if (allWins) return 'player_win';
  if (allLosses) return 'player_loss';
  return 'idle';
}

function menuMarkup(): string {
  return `
    <main id="app-main" class="screen menu-screen">
      <div class="ambient-lamp ambient-lamp-menu" aria-hidden="true"></div>
      <section class="brand-lockup" aria-labelledby="game-title">
        <div class="brand-kicker"><span></span><p>OFFICIAL INSPIRE PRESENTS</p><span></span></div>
        <h1 id="game-title" aria-label="${APP_NAME}"><span>BLACK</span><em>JAK</em></h1>
        <p class="tagline">${APP_TAGLINE}</p>
        <p class="brand-note">Private table. Fictional chips. Questionable judgment.</p>
      </section>
      <nav class="menu-grid" aria-label="BlackJak modes">
        ${button('Classic BlackJak', 'classic')}
        ${button("Jak's House", 'house')}
        ${button('Stats', 'stats')}
        ${button('Settings', 'settings')}
      </nav>
      <div class="menu-bankroll" aria-label="Saved Classic BlackJak bankroll">Practice chips <strong>${formatChips(model.profile.chips)}</strong></div>
      <p class="fine-print">Fictional practice chips only. No purchases, cash-out, or real-money wagering.</p>
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

function settingsMarkup(): string {
  return `
    <main id="app-main" class="screen panel-screen">
      <div class="ambient-lamp" aria-hidden="true"></div>
      <button class="back-button" data-screen="menu">← Menu</button>
      <section class="glass-panel settings-panel">
        <p class="eyebrow">TABLE SETUP</p>
        <h1>Settings</h1>
        <div class="settings-list">
          <div class="setting-row"><span><strong>Motion</strong><small>Animations follow your device preference.</small></span><b>System</b></div>
          <div class="setting-row"><span><strong>Audio</strong><small>Sound and ambience arrive in Prompt 7.</small></span><b>Later</b></div>
          <div class="setting-row"><span><strong>Haptics</strong><small>Mobile feedback arrives in Prompt 7.</small></span><b>Later</b></div>
          <div class="setting-row"><span><strong>Dealer commentary</strong><small>Reactive Jak lines are enabled and never block play.</small></span><b>On</b></div>
          <div class="setting-row"><span><strong>Classic rules</strong><small>3:2 blackjack · dealer stands on soft 17.</small></span><b>Locked</b></div>
        </div>
        <p class="panel-footnote">Reduced-motion mode is already respected automatically.</p>
      </section>
    </main>`;
}

function statsMarkup(): string {
  const stats = model.profile.stats;
  return `
    <main id="app-main" class="screen panel-screen">
      <button class="back-button" data-screen="menu">← Menu</button>
      <section class="glass-panel stats-panel">
        <p class="eyebrow">CLASSIC BLACKJAK</p>
        <h1>Stats</h1>
        <div class="stats-grid">
          ${statCard('Practice chips', formatChips(model.profile.chips))}
          ${statCard('Hands', stats.totalHands)}
          ${statCard('Wins', stats.wins)}
          ${statCard('Losses', stats.losses)}
          ${statCard('Pushes', stats.pushes)}
          ${statCard('Blackjacks', stats.blackjacks)}
        </div>
        <p class="stats-note">Split hands are counted individually in win/loss statistics.</p>
      </section>
    </main>`;
}

function statCard(label: string, value: string | number): string {
  return `<div class="stat-card"><span>${label}</span><strong>${value}</strong></div>`;
}

function handResultLabel(round: RoundState, hand: PlayerHand): string {
  if (round.phase !== 'resolved') return hand.status === 'active' ? 'PLAYING' : hand.status.toUpperCase();
  const result = round.results.find((entry) => entry.handId === hand.id);
  return result ? result.outcome.toUpperCase() : hand.status.toUpperCase();
}

function outcomeClass(round: RoundState, hand: PlayerHand): string {
  if (round.phase !== 'resolved') return '';
  const outcome = round.results.find((entry) => entry.handId === hand.id)?.outcome;
  return outcome ? `is-${outcome}` : '';
}

function playerHandsMarkup(round: RoundState | null): string {
  if (!round?.hands.length) {
    return `<div class="empty-hand" aria-hidden="true"><span>PLACE YOUR STAKE</span></div>`;
  }

  return `<div class="player-hands ${round.hands.length > 1 ? 'is-split' : ''}">
    ${round.hands.map((hand, index) => {
      const evaluation = evaluateHand(hand.cards);
      const active = round.phase === 'player-turn' && index === round.activeHandIndex;
      return `
        <section class="player-hand ${active ? 'is-active' : ''} ${evaluation.isBust ? 'is-bust' : ''} ${outcomeClass(round, hand)}" aria-label="Player hand ${index + 1}${active ? ', active' : ''}">
          <div class="hand-meta">
            <span>HAND ${index + 1}${round.hands.length > 1 ? ` / ${round.hands.length}` : ''}</span>
            <strong>${evaluation.total}</strong>
            <span class="hand-wager">${formatChips(hand.wager)} chips</span>
          </div>
          <div class="cards">${hand.cards.map((card, cardIndex) => cardMarkup(card, false, cardIndex + index * 2)).join('')}</div>
          <span class="hand-state">${handResultLabel(round, hand)}</span>
        </section>`;
    }).join('')}
  </div>`;
}

function resultBannerMarkup(round: RoundState | null): string {
  if (!round || round.phase !== 'resolved') return '';
  const tone = roundTone(round);
  const net = round.results.reduce((sum, result) => sum + result.net, 0);
  const netLabel = net === 0 ? '±0' : `${net > 0 ? '+' : ''}${formatChips(net)}`;
  const titleMap: Record<Exclude<RoundTone, 'idle' | 'playing'>, string> = {
    blackjack: 'BLACKJAK',
    win: 'PAID',
    loss: 'BUSTED',
    push: 'PUSH',
    mixed: 'SPLIT DECISION',
  };
  const detail = round.results.length > 1
    ? round.results.map((result, index) => `H${index + 1} ${result.outcome.toUpperCase()}`).join(' · ')
    : round.results[0]?.outcome.toUpperCase() ?? '';

  return `
    <div class="result-banner result-${tone}" aria-live="polite">
      <span>ROUND RESULT</span>
      <strong>${titleMap[tone as Exclude<RoundTone, 'idle' | 'playing'>]}</strong>
      <b>${netLabel} chips</b>
      <small>${detail}</small>
    </div>`;
}

function bettingControlsMarkup(): string {
  if (model.profile.chips <= 0) {
    return `
      <div class="betting-panel broke-panel">
        <p>You're out of practice chips.</p>
        <button class="primary-action" data-action="refill">Refill Practice Chips</button>
        <span>No purchase required. This simply restores the practice stack.</span>
      </div>`;
  }

  const selected = normalizedStake();
  const maxValue = Math.min(model.profile.chips, MAX_STAKE);
  return `
    <div class="betting-panel" aria-label="Choose a fictional chip stake">
      <div class="betting-heading"><span>STAKE</span><strong>${formatChips(selected)} CHIPS</strong></div>
      <div class="stake-row">
        ${STAKE_OPTIONS.map((stake) => `
          <button class="stake-button ${selected === stake ? 'is-selected' : ''}" data-stake="${stake}" aria-pressed="${selected === stake}" ${stake > model.profile.chips ? 'disabled' : ''}>${stake}</button>`).join('')}
        <button class="stake-button ${selected === maxValue ? 'is-selected' : ''}" data-stake="max" aria-pressed="${selected === maxValue}">MAX</button>
      </div>
      <button class="primary-action deal-button" data-action="deal">${model.round?.phase === 'resolved' ? 'Deal Again' : 'Deal Hand'}</button>
    </div>`;
}

function actionControlsMarkup(round: RoundState): string {
  const activeHand = getActiveHand(round);
  const valid = allowedActions(activeHand, model.profile.chips);
  return `
    <div class="action-bar" aria-label="Blackjack actions">
      ${(['hit', 'stand', 'double', 'split'] as PlayerAction[])
        .map((action) => `<button data-action="${action}" ${valid.includes(action) ? '' : 'disabled'}>${action.toUpperCase()}</button>`)
        .join('')}
    </div>`;
}

function classicMarkup(): string {
  const round = model.round;
  const dealerCards = round?.dealer ?? [];
  const revealDealer = round?.phase === 'resolved';
  const dealerTotal = dealerCards.length ? (revealDealer ? evaluateHand(dealerCards).total : '?') : '—';
  const showActions = round?.phase === 'player-turn';
  const tone = roundTone(round);

  return `
    <main id="app-main" class="screen table-screen round-${tone}">
      <div class="ambient-lamp ambient-lamp-table" aria-hidden="true"></div>
      <header class="table-header">
        <button class="back-button" data-screen="menu">← Menu</button>
        <div class="hud" aria-label="Player resources">
          <span>CHIPS <strong>${formatChips(model.profile.chips)}</strong></span>
          <span>REP <strong>${model.profile.rep}</strong></span>
        </div>
      </header>

      <section class="table" aria-label="Classic BlackJak table">
        <div class="hand-zone dealer-zone">
          <div class="dealer-identity-row">
            <span class="dealer-avatar" aria-hidden="true">JG</span>
            <span class="dealer-name"><b>JAK</b><small>HOUSE DEALER</small></span>
            <strong class="dealer-total" aria-label="Dealer total">${dealerTotal}</strong>
          </div>
          <div class="cards dealer-cards">${dealerCards.length ? dealerCards.map((card, index) => cardMarkup(card, index === 1 && !revealDealer, index)).join('') : '<div class="empty-cards" aria-hidden="true"><span>DEALER</span></div>'}</div>
          <div class="dealer-commentary" role="status" aria-live="polite" aria-atomic="true" data-event="${model.commentary.event}">
            <span class="dealer-quote-mark" aria-hidden="true">“</span>
            <p>${model.commentary.text}</p>
          </div>
        </div>

        <div class="table-mark" aria-hidden="true">BLACK<span>JAK</span></div>

        <div class="hand-zone player-zone">
          ${playerHandsMarkup(round)}
        </div>
        ${resultBannerMarkup(round)}
      </section>

      <section class="game-controls" aria-label="Classic BlackJak controls">
        <p class="status-line" aria-live="polite">${statusText(round)}</p>
        ${model.error ? `<p class="error-line" role="alert">${model.error}</p>` : ''}
        ${showActions && round ? actionControlsMarkup(round) : bettingControlsMarkup()}
        <p class="practice-note">Practice chips have no monetary value.</p>
      </section>
    </main>`;
}

function statusText(round: RoundState | null): string {
  if (!round) return 'Choose a stake and deal your first hand.';
  if (round.phase === 'resolved') {
    return round.results.map((result, index) => {
      const delta = result.net === 0 ? '±0' : `${result.net > 0 ? '+' : ''}${formatChips(result.net)}`;
      return `${round.results.length > 1 ? `Hand ${index + 1}: ` : ''}${result.outcome.toUpperCase()} ${delta}`;
    }).join(' · ');
  }

  if (round.phase === 'player-turn') {
    const hand = getActiveHand(round);
    return round.hands.length > 1
      ? `Hand ${round.activeHandIndex + 1} of ${round.hands.length} · ${evaluateHand(hand.cards).total}`
      : `Your move · ${evaluateHand(hand.cards).total}`;
  }

  return 'Dealer is playing…';
}

function settleIfResolved(): void {
  if (!model.round || model.round.phase !== 'resolved') return;
  persistProfile(settleResults(model.profile, model.round.results));
  updateResultStreaks(model.round);
  say(resolutionDialogueEvent(model.round));
}

function dealRound(): void {
  const stake = normalizedStake();
  if (stake <= 0) throw new Error('Refill practice chips before dealing.');

  const before = model.profile;
  const reserved = reserveStake(before, stake);
  persistProfile(reserved);

  try {
    model.round = startRound(stake);
    if (model.round.phase === 'resolved') {
      settleIfResolved();
    } else {
      say('idle');
    }
  } catch (error) {
    persistProfile(before);
    throw error;
  }
}

function takePlayerAction(action: PlayerAction): void {
  if (!model.round || model.round.phase !== 'player-turn') throw new Error('Deal a hand first.');

  const hand = getActiveHand(model.round);
  const startingTotal = evaluateHand(hand.cards).total;
  const activeHandId = hand.id;
  const before = model.profile;
  const additionalStake = action === 'double' || action === 'split' ? hand.wager : 0;

  if (!allowedActions(hand, before.chips).includes(action)) {
    throw new Error(`Action "${action}" is not currently allowed.`);
  }

  if (additionalStake > 0) persistProfile(reserveStake(before, additionalStake));

  try {
    performAction(model.round, action, before.chips);

    if (model.round.phase === 'resolved') {
      settleIfResolved();
    } else if (action === 'split') {
      say('split_started');
    } else if (action === 'hit') {
      const updatedHand = model.round.hands.find((candidate) => candidate.id === activeHandId);
      if (updatedHand) {
        const updated = evaluateHand(updatedHand.cards);
        if (updated.isBust) {
          say('player_bust');
        } else if (startingTotal >= 17 && startingTotal <= 20) {
          say(`hit_${startingTotal}` as DialogueEvent);
        } else if (startingTotal >= 16) {
          say('survived_risky_hit');
        }
      }
    }
  } catch (error) {
    if (additionalStake > 0) persistProfile(before);
    throw error;
  }
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
      app().innerHTML = statsMarkup();
      break;
    case 'settings':
      app().innerHTML = settingsMarkup();
      break;
  }

  bindEvents();
}

function bindEvents(): void {
  document.querySelectorAll<HTMLElement>('[data-screen]').forEach((element) => {
    element.addEventListener('click', () => {
      const screen = element.dataset.screen as AppScreen | undefined;
      if (!screen) return;
      if (screen === 'classic' && model.screen !== 'classic') {
        say(model.profile.stats.totalHands > 0 ? 'return_player' : 'game_start');
      }
      model.screen = screen;
      model.error = null;
      render();
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-stake]').forEach((element) => {
    element.addEventListener('click', () => {
      const stake = element.dataset.stake;
      const next = stake === 'max' ? Math.min(model.profile.chips, MAX_STAKE) : Number(stake);
      if (Number.isFinite(next) && next > 0 && next <= model.profile.chips) {
        model.selectedStake = next;
        model.error = null;
        render();
      }
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((element) => {
    element.addEventListener('click', () => {
      const action = element.dataset.action;
      model.error = null;
      try {
        if (action === 'deal') {
          dealRound();
        } else if (action === 'refill') {
          persistProfile(refillPracticeChips(model.profile));
          model.selectedStake = 25;
          model.round = null;
          say('refill_chips');
        } else if (action) {
          takePlayerAction(action as PlayerAction);
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
