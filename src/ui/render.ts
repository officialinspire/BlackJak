import { APP_NAME, APP_TAGLINE, MAX_STAKE, STAKE_OPTIONS } from '../config/constants';
import { HOUSE_MODIFIERS } from '../data/house';
import { ACHIEVEMENTS, titleProgressForRep, type AchievementDefinition } from '../data/progression';
import {
  allowedActions,
  applyProgression,
  completeHouseRound,
  createHouseState,
  emptyRoundProgressionContext,
  evaluateHand,
  getActiveHand,
  hotHandMultiplier,
  isGoldCard,
  performAction,
  refillPracticeChips,
  replayHouseRound,
  reserveStake,
  settleResults,
  selectDialogue,
  startHouseRound,
  unlockAchievementIds,
  startRound,
  type DialogueEvent,
  type DialogueMemory,
  type DialogueSelection,
  type HouseState,
  type PlayerAction,
  type PlayerHand,
  type RoundProgressionContext,
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
  roundProgress: RoundProgressionContext;
  achievementToasts: AchievementDefinition[];
  lastRepEarned: number;
  house: HouseState;
  houseLastBonusRep: number;
  houseTokenAwarded: boolean;
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
  roundProgress: emptyRoundProgressionContext(),
  achievementToasts: [],
  lastRepEarned: 0,
  house: createHouseState(),
  houseLastBonusRep: 0,
  houseTokenAwarded: false,
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
  if (model.profile.progression.currentWinStreak >= 3) return 'winning_streak';
  if (model.profile.progression.currentLossStreak >= 3) return 'losing_streak';
  if (round.results.every((result) => result.outcome === 'push')) return 'push';
  if (allWins) return 'player_win';
  if (allLosses) return 'player_loss';
  return 'idle';
}

function menuMarkup(): string {
  const title = titleProgressForRep(model.profile.rep);
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
        ${button('Classic BlackJak · Standard', 'classic')}
        ${button("Jak's House · Arcade", 'house')}
        ${button('Stats', 'stats')}
        ${button('Settings', 'settings')}
      </nav>
      <div class="menu-progression" aria-label="BlackJak progression">
        <span>${title.current.name}</span>
        <b>${model.profile.rep} REP</b>
      </div>
      <div class="menu-bankroll" aria-label="Saved Classic BlackJak bankroll">Practice chips <strong>${formatChips(model.profile.chips)}</strong></div>
      <p class="fine-print">Fictional practice chips only. No purchases, cash-out, or real-money wagering.</p>
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
  const title = titleProgressForRep(model.profile.rep);
  const unlocked = new Set(model.profile.progression.unlockedAchievements);
  return `
    <main id="app-main" class="screen panel-screen">
      <button class="back-button" data-screen="menu">← Menu</button>
      <section class="glass-panel stats-panel">
        <p class="eyebrow">CLASSIC BLACKJAK</p>
        <h1>Stats</h1>
        <div class="progression-summary">
          <div class="title-lockup">
            <span>CURRENT TITLE</span>
            <strong>${title.current.name}</strong>
            <b>${model.profile.rep} REP</b>
          </div>
          <div class="rep-track" aria-label="${title.next ? `${Math.round(title.percent)} percent toward ${title.next.name}` : 'Maximum title reached'}">
            <span style="width: ${title.percent}%"></span>
          </div>
          <small>${title.next ? `${title.next.minRep - model.profile.rep} REP to ${title.next.name}` : 'Top title unlocked.'}</small>
        </div>
        <div class="stats-grid">
          ${statCard('Practice chips', formatChips(model.profile.chips))}
          ${statCard('Hands', stats.totalHands)}
          ${statCard('Wins', stats.wins)}
          ${statCard('Losses', stats.losses)}
          ${statCard('Pushes', stats.pushes)}
          ${statCard('Blackjacks', stats.blackjacks)}
        </div>
        <div class="achievement-section">
          <div class="section-heading"><span>ACHIEVEMENTS</span><b>${unlocked.size}/${ACHIEVEMENTS.length}</b></div>
          <div class="achievement-grid">
            ${ACHIEVEMENTS.map((achievement) => achievementCardMarkup(achievement, unlocked.has(achievement.id))).join('')}
          </div>
        </div>
        <p class="stats-note">Split hands are counted individually in win/loss statistics.</p>
      </section>
    </main>`;
}

function statCard(label: string, value: string | number): string {
  return `<div class="stat-card"><span>${label}</span><strong>${value}</strong></div>`;
}

function achievementCardMarkup(achievement: AchievementDefinition, unlocked: boolean): string {
  return `
    <article class="achievement-card ${unlocked ? 'is-unlocked' : 'is-locked'}">
      <span class="achievement-mark" aria-hidden="true">${unlocked ? '◆' : '◇'}</span>
      <div><strong>${achievement.name}</strong><p>${achievement.description}</p></div>
      <b>${unlocked ? 'UNLOCKED' : 'LOCKED'}</b>
    </article>`;
}

function achievementToastMarkup(): string {
  const achievement = model.achievementToasts[0];
  if (!achievement) return '';
  const extra = model.achievementToasts.length - 1;
  return `
    <div class="achievement-toast" role="status" aria-live="polite" aria-atomic="true">
      <span class="toast-icon" aria-hidden="true">◆</span>
      <div><small>ACHIEVEMENT UNLOCKED</small><strong>${achievement.name}</strong><p>${achievement.description}</p></div>
      ${extra > 0 ? `<b>+${extra} MORE</b>` : ''}
    </div>`;
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

function playerHandsMarkup(round: RoundState | null, house: HouseState | null = null): string {
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
          <div class="cards">${hand.cards.map((card, cardIndex) => cardMarkup(card, false, cardIndex + index * 2, house && isGoldCard(house, hand.id, cardIndex) ? 'gold' : 'standard')).join('')}</div>
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
  const repLine = model.lastRepEarned > 0 ? `+${model.lastRepEarned} REP` : '';

  return `
    <div class="result-banner result-${tone}" aria-live="polite">
      <span>ROUND RESULT</span>
      <strong>${titleMap[tone as Exclude<RoundTone, 'idle' | 'playing'>]}</strong>
      <b>${netLabel} chips</b>
      <small>${detail}</small>
      ${repLine ? `<em>${repLine}</em>` : ''}
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

function houseBettingControlsMarkup(): string {
  const replay = model.house.replayAvailable && model.house.currentStake
    ? `
      <div class="run-it-back-panel">
        <div><span>RUN IT BACK</span><strong>FREE REDEAL · ${formatChips(model.house.currentStake)} CHIP BASE STAKE</strong></div>
        <button class="house-special-action" data-action="run-it-back">Use Token (${model.house.runItBackTokens})</button>
      </div>`
    : '';

  return `${replay}${bettingControlsMarkup()}`;
}

function houseModifierStripMarkup(): string {
  const nextGoldIn = model.house.roundNumber % 3 === 0 ? 3 : 3 - (model.house.roundNumber % 3);
  const nextHotMultiplier = hotHandMultiplier(model.house.hotHandStreak + 1);
  const goldActive = Boolean(model.round && model.house.goldRound);

  const statusById: Record<string, string> = {
    'gold-card': goldActive ? 'ACTIVE THIS HAND' : `IN ${nextGoldIn} PAID HAND${nextGoldIn === 1 ? '' : 'S'}`,
    'run-it-back': `${model.house.runItBackTokens} TOKEN${model.house.runItBackTokens === 1 ? '' : 'S'}`,
    'hot-hand': `NEXT WIN ×${nextHotMultiplier.toFixed(2)} REP`,
  };

  return `
    <div class="house-modifier-grid" aria-label="Jak's House active modifier rules">
      ${HOUSE_MODIFIERS.map((modifier) => `
        <article class="house-modifier ${modifier.id === 'gold-card' && goldActive ? 'is-active' : ''}">
          <span>${modifier.name}</span>
          <strong>${statusById[modifier.id]}</strong>
          <p>${modifier.shortDescription}</p>
        </article>`).join('')}
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
  const progression = titleProgressForRep(model.profile.rep);

  return `
    <main id="app-main" class="screen table-screen round-${tone}">
      <div class="ambient-lamp ambient-lamp-table" aria-hidden="true"></div>
      <header class="table-header">
        <button class="back-button" data-screen="menu">← Menu</button>
        <div class="hud" aria-label="Player resources and progression">
          <span>CHIPS <strong>${formatChips(model.profile.chips)}</strong></span>
          <span class="title-pill">${progression.current.name}</span>
          <span class="rep-pill">REP <strong>${model.profile.rep}</strong><i class="rep-mini-track" aria-hidden="true"><i style="width:${progression.percent}%"></i></i></span>
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
      ${achievementToastMarkup()}
    </main>`;
}

function houseMarkup(): string {
  const round = model.round;
  const dealerCards = round?.dealer ?? [];
  const revealDealer = round?.phase === 'resolved';
  const dealerTotal = dealerCards.length ? (revealDealer ? evaluateHand(dealerCards).total : '?') : '—';
  const showActions = round?.phase === 'player-turn';
  const tone = roundTone(round);
  const progression = titleProgressForRep(model.profile.rep);

  return `
    <main id="app-main" class="screen table-screen house-screen round-${tone}">
      <div class="ambient-lamp ambient-lamp-table house-lamp" aria-hidden="true"></div>
      <header class="table-header">
        <button class="back-button" data-screen="menu">← Menu</button>
        <div class="hud" aria-label="Player resources and progression">
          <span>CHIPS <strong>${formatChips(model.profile.chips)}</strong></span>
          <span class="title-pill">${progression.current.name}</span>
          <span class="rep-pill">REP <strong>${model.profile.rep}</strong><i class="rep-mini-track" aria-hidden="true"><i style="width:${progression.percent}%"></i></i></span>
        </div>
      </header>

      <section class="house-mode-banner" aria-labelledby="house-mode-title">
        <div>
          <span class="house-kicker">ARCADE RULES · NOT STANDARD BLACKJACK</span>
          <h1 id="house-mode-title">JAK'S HOUSE</h1>
          <p>Blackjack-inspired arcade play. House modifiers can change a hand, but Classic BlackJak remains standard and separate.</p>
        </div>
        <b>HOUSE HAND ${model.house.roundNumber || '—'}</b>
      </section>

      ${houseModifierStripMarkup()}

      <section class="table house-table" aria-label="Jak's House arcade blackjack table">
        <div class="hand-zone dealer-zone">
          <div class="dealer-identity-row">
            <span class="dealer-avatar house-avatar" aria-hidden="true">JG</span>
            <span class="dealer-name"><b>JAK</b><small>HOUSE RULES ACTIVE</small></span>
            <strong class="dealer-total" aria-label="Dealer total">${dealerTotal}</strong>
          </div>
          <div class="cards dealer-cards">${dealerCards.length ? dealerCards.map((card, index) => cardMarkup(card, index === 1 && !revealDealer, index)).join('') : '<div class="empty-cards" aria-hidden="true"><span>DEALER</span></div>'}</div>
          <div class="dealer-commentary" role="status" aria-live="polite" aria-atomic="true" data-event="${model.commentary.event}">
            <span class="dealer-quote-mark" aria-hidden="true">“</span>
            <p>${model.commentary.text}</p>
          </div>
        </div>

        <div class="table-mark house-table-mark" aria-hidden="true">JAK'S<span>HOUSE</span></div>

        <div class="hand-zone player-zone">
          ${playerHandsMarkup(round, model.house)}
        </div>
        ${resultBannerMarkup(round)}
      </section>

      <section class="game-controls house-controls" aria-label="Jak's House controls">
        <p class="status-line" aria-live="polite">${statusText(round)}</p>
        ${model.houseLastBonusRep > 0 ? `<p class="house-bonus-line">HOT HAND BONUS +${model.houseLastBonusRep} REP</p>` : ''}
        ${model.houseTokenAwarded ? '<p class="house-token-line">RUN IT BACK TOKEN EARNED</p>' : ''}
        ${model.error ? `<p class="error-line" role="alert">${model.error}</p>` : ''}
        ${showActions && round ? actionControlsMarkup(round) : houseBettingControlsMarkup()}
        <p class="practice-note">Jak's House uses fictional practice chips and arcade modifiers. No monetary value.</p>
      </section>
      ${achievementToastMarkup()}
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

  const settled = settleResults(model.profile, model.round.results);
  const progression = applyProgression(settled, model.round, model.roundProgress);
  persistProfile(progression.profile);
  model.lastRepEarned = progression.repEarned;
  model.achievementToasts = [...model.achievementToasts, ...progression.unlocked];
  say(resolutionDialogueEvent(model.round));
}

function settleHouseIfResolved(): void {
  if (!model.round || model.round.phase !== 'resolved') return;

  const settled = settleResults(model.profile, model.round.results);
  const progression = applyProgression(settled, model.round, model.roundProgress);
  const houseResolution = completeHouseRound(model.house, model.round, progression.repEarned);
  const withHouseBonus = {
    ...progression.profile,
    rep: progression.profile.rep + houseResolution.hotHandBonusRep,
  };

  persistProfile(withHouseBonus);
  model.house = houseResolution.house;
  model.houseLastBonusRep = houseResolution.hotHandBonusRep;
  model.houseTokenAwarded = houseResolution.tokenAwarded;
  model.lastRepEarned = progression.repEarned + houseResolution.hotHandBonusRep;
  model.achievementToasts = [...model.achievementToasts, ...progression.unlocked];
  say(resolutionDialogueEvent(model.round));
}

function dealRound(): void {
  const stake = normalizedStake();
  if (stake <= 0) throw new Error('Refill practice chips before dealing.');

  model.achievementToasts = [];
  model.lastRepEarned = 0;
  model.roundProgress = emptyRoundProgressionContext();

  if (model.profile.progression.currentLossStreak >= 5) {
    const again = unlockAchievementIds(model.profile, ['again']);
    if (again.unlocked.length > 0) {
      persistProfile(again.profile);
      model.achievementToasts = again.unlocked;
    }
  }

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

function dealHouseRound(): void {
  const stake = normalizedStake();
  if (stake <= 0) throw new Error('Refill practice chips before dealing.');

  model.achievementToasts = [];
  model.lastRepEarned = 0;
  model.houseLastBonusRep = 0;
  model.houseTokenAwarded = false;
  model.roundProgress = emptyRoundProgressionContext();

  if (model.profile.progression.currentLossStreak >= 5) {
    const again = unlockAchievementIds(model.profile, ['again']);
    if (again.unlocked.length > 0) {
      persistProfile(again.profile);
      model.achievementToasts = again.unlocked;
    }
  }

  const beforeProfile = model.profile;
  const beforeHouse = model.house;
  persistProfile(reserveStake(beforeProfile, stake));

  try {
    const started = startHouseRound(stake, model.house);
    model.house = started.house;
    model.round = started.round;

    if (model.round.phase === 'resolved') {
      settleHouseIfResolved();
    } else {
      say('idle');
    }
  } catch (error) {
    persistProfile(beforeProfile);
    model.house = beforeHouse;
    throw error;
  }
}

function runHouseReplay(): void {
  model.achievementToasts = [];
  model.lastRepEarned = 0;
  model.houseLastBonusRep = 0;
  model.houseTokenAwarded = false;
  model.roundProgress = emptyRoundProgressionContext();

  const beforeHouse = model.house;
  try {
    const replay = replayHouseRound(model.house);
    model.house = replay.house;
    model.round = replay.round;

    if (model.round.phase === 'resolved') {
      settleHouseIfResolved();
    } else {
      say('idle');
    }
  } catch (error) {
    model.house = beforeHouse;
    throw error;
  }
}

function takePlayerAction(action: PlayerAction): void {
  if (!model.round || model.round.phase !== 'player-turn') throw new Error('Deal a hand first.');

  const hand = getActiveHand(model.round);
  const startingTotal = evaluateHand(hand.cards).total;
  const activeHandId = hand.id;
  if (action === 'hit' && startingTotal === 20) model.roundProgress.hitOn20 = true;
  const before = model.profile;
  const additionalStake = action === 'double' || action === 'split' ? hand.wager : 0;

  if (!allowedActions(hand, before.chips).includes(action)) {
    throw new Error(`Action "${action}" is not currently allowed.`);
  }

  if (additionalStake > 0) persistProfile(reserveStake(before, additionalStake));

  try {
    performAction(model.round, action, before.chips);

    if (action === 'hit') {
      const updatedHand = model.round.hands.find((candidate) => candidate.id === activeHandId);
      if (updatedHand && !evaluateHand(updatedHand.cards).isBust && startingTotal >= 16) {
        model.roundProgress.riskyHitSurvived = true;
      }
    }

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

function takeHouseAction(action: PlayerAction): void {
  if (!model.round || model.round.phase !== 'player-turn') throw new Error('Deal a House hand first.');

  const hand = getActiveHand(model.round);
  const startingTotal = evaluateHand(hand.cards).total;
  const activeHandId = hand.id;
  if (action === 'hit' && startingTotal === 20) model.roundProgress.hitOn20 = true;
  const before = model.profile;
  const additionalStake = action === 'double' || action === 'split' ? hand.wager : 0;

  if (!allowedActions(hand, before.chips).includes(action)) {
    throw new Error(`Action "${action}" is not currently allowed.`);
  }

  if (additionalStake > 0) persistProfile(reserveStake(before, additionalStake));

  try {
    performAction(model.round, action, before.chips);

    if (action === 'hit') {
      const updatedHand = model.round.hands.find((candidate) => candidate.id === activeHandId);
      if (updatedHand && !evaluateHand(updatedHand.cards).isBust && startingTotal >= 16) {
        model.roundProgress.riskyHitSurvived = true;
      }
    }

    if (model.round.phase === 'resolved') {
      settleHouseIfResolved();
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
      app().innerHTML = houseMarkup();
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
      if ((screen === 'classic' || screen === 'house') && screen !== model.screen) {
        model.round = null;
        model.roundProgress = emptyRoundProgressionContext();
        model.achievementToasts = [];
        model.lastRepEarned = 0;
        model.houseLastBonusRep = 0;
        model.houseTokenAwarded = false;
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
          if (model.screen === 'house') dealHouseRound();
          else dealRound();
        } else if (action === 'run-it-back') {
          runHouseReplay();
        } else if (action === 'refill') {
          persistProfile(refillPracticeChips(model.profile));
          model.selectedStake = 25;
          model.round = null;
          model.roundProgress = emptyRoundProgressionContext();
          model.achievementToasts = [];
          model.lastRepEarned = 0;
          model.houseLastBonusRep = 0;
          model.houseTokenAwarded = false;
          say('refill_chips');
        } else if (action) {
          if (model.screen === 'house') takeHouseAction(action as PlayerAction);
          else takePlayerAction(action as PlayerAction);
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
