import { APP_NAME, APP_TAGLINE, MAX_STAKE, STAKE_OPTIONS } from '../config/constants';
import { feedbackEngine, haptic, type FeedbackCue, type HapticCue } from '../feedback/feedback';
import { HOUSE_MODIFIERS } from '../data/house';
import { ACHIEVEMENTS, titleProgressForRep, type AchievementDefinition } from '../data/progression';
import {
  allowedActions,
  applyProgression,
  applyRepBonus,
  completeDailyChallenge,
  completeHouseRound,
  createDailyChallenge,
  createHouseState,
  dailyShareText,
  dailyStateForDate,
  emptyRoundProgressionContext,
  evaluateHand,
  getActiveHand,
  hotHandMultiplier,
  isGoldCard,
  localDateKey,
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
import { loadFeedbackPreferences, saveFeedbackPreferences } from '../storage/preferences';
import { loadProfile, saveProfile } from '../storage/profile';
import type { AppScreen } from '../types/app';
import type { DailyOutcome, PlayerProfile } from '../types/profile';
import type { FeedbackPreferences, VisualPreferences } from '../types/preferences';
import { cardMarkup, setActiveCardTheme } from './card';
import { CARD_THEMES } from '../data/card-atlas';
import { CARD_THEME_IDS, type CardThemeId } from '../data/visual-atlas';
import { loadVisualPreferences, saveVisualPreferences } from '../storage/visual-preferences';
import { gameSceneMarkup } from './scene';
import { escapeHtml } from '../util/html';
import { ACTION_SHORTCUTS, dockPhaseFor, tableDockMarkup, type DockPhase } from './table-dock';
import { FxQueue, controlsStateKey, fxClassNames, fxStyleVars, shouldIgnoreActivation, type FxCue } from './fx';
import { menuBoardMarkup } from './menu-board';
import { escapeIntent, isTableScreen, pauseMenuMarkup } from './pause-menu';
import { dialoguePanelMarkup, type PanelStatus } from './dialogue-panel';
import { dealerMarkup } from './dealer';
import type { DealerAction } from '../data/dealer-visuals';

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
  houseCheckpoint: HouseState | null;
  houseLastBonusRep: number;
  houseTokenAwarded: boolean;
  preferences: FeedbackPreferences;
  visual: VisualPreferences;
  dailyDateKey: string;
  dailyRound: RoundState | null;
  dailyShareStatus: string | null;
  /** One-shot Jak gesture for the next render (visual only). */
  dealerCue: DealerAction | null;
  /** In-game pause board is open over the table (the round is untouched). */
  pauseMenuOpen: boolean;
  /** "Main Menu" was pressed once while a hand is in play; the next press leaves. */
  pauseConfirmLeave: boolean;
  /** Increments per dealt round; keys card animations to a single round. */
  roundSerial: number;
}

type RoundTone = 'idle' | 'playing' | 'blackjack' | 'win' | 'loss' | 'push' | 'mixed';


const FOCUS_ATTRIBUTES = [
  'data-action',
  'data-daily-action',
  'data-stake',
  'data-setting-toggle',
  'data-setting-volume',
  'data-card-theme',
  'data-pause-action',
  'data-pause',
  'data-deck-cycle',
  'data-screen',
] as const;

type FocusAttribute = (typeof FOCUS_ATTRIBUTES)[number];

interface FocusKey {
  attribute: FocusAttribute;
  value: string;
}

let lastRenderedScreen: AppScreen | null = null;
let globalKeyboardBound = false;

const initialProfile = loadProfile();
const initialPreferences = loadFeedbackPreferences();
const initialVisual = loadVisualPreferences();
setActiveCardTheme(initialVisual.cardTheme);
const initialDateKey = localDateKey();
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
  houseCheckpoint: null,
  houseLastBonusRep: 0,
  houseTokenAwarded: false,
  preferences: initialPreferences,
  visual: initialVisual,
  dailyDateKey: initialDateKey,
  dailyRound: null,
  dailyShareStatus: null,
  dealerCue: null,
  pauseMenuOpen: false,
  pauseConfirmLeave: false,
  roundSerial: 0,
};

/** Cards already on screen in the previous render: only new cards play the deal-in. */
let renderedCardKeys = new Set<string>();
let pendingCardKeys = new Set<string>();

const fxQueue = new FxQueue();
/** Cues for the render in progress (one-shot; empty for plain re-renders). */
let currentFx: ReadonlySet<FxCue> = new Set();
/** When gameplay controls last changed identity: pointer taps just after are stale double-taps. */
let controlsChangedAt = -Infinity;
let lastControlsState: string | null = null;

function cueFx(...cues: FxCue[]): void {
  fxQueue.cue(...cues);
}

/** Card key already shown face-down in the previous render (so a reveal flips). */
function wasRenderedHidden(key: string): boolean {
  return renderedCardKeys.has(`${model.roundSerial}:${key}`);
}

function cardIsNew(key: string): boolean {
  const scoped = `${model.roundSerial}:${key}`;
  pendingCardKeys.add(scoped);
  return !renderedCardKeys.has(scoped);
}

const app = (): HTMLElement => {
  const root = document.querySelector<HTMLElement>('#app');
  if (!root) throw new Error('App root #app was not found.');
  return root;
};

function captureFocusKey(): FocusKey | null {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || active === document.body) return null;

  for (const attribute of FOCUS_ATTRIBUTES) {
    const value = active.getAttribute(attribute);
    if (value !== null) return { attribute, value };
  }

  return null;
}

function matchingFocusTarget(key: FocusKey | null): HTMLElement | null {
  if (!key) return null;
  return [...document.querySelectorAll<HTMLElement>(`[${key.attribute}]`)]
    .find((element) => element.getAttribute(key.attribute) === key.value && !element.hasAttribute('disabled')) ?? null;
}

function focusAfterRender(key: FocusKey | null, screenChanged: boolean, hadInteractiveFocus: boolean): void {
  if (screenChanged) {
    document.querySelector<HTMLElement>('#app-main')?.focus({ preventScroll: true });
    return;
  }

  if (!hadInteractiveFocus) return;

  const exact = matchingFocusTarget(key);
  if (exact) {
    exact.focus({ preventScroll: true });
    return;
  }

  const fallback =
    document.querySelector<HTMLElement>('.action-bar button:not(:disabled)') ??
    document.querySelector<HTMLElement>('[data-action="deal"]:not(:disabled)') ??
    document.querySelector<HTMLElement>('[data-action="start-daily"]:not(:disabled)') ??
    document.querySelector<HTMLElement>('[data-stake].is-selected:not(:disabled)') ??
    document.querySelector<HTMLElement>('.back-button');

  fallback?.focus({ preventScroll: true });
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.matches('input, textarea, select, [contenteditable="true"]');
}

function clickShortcut(selector: string): boolean {
  const control = document.querySelector<HTMLButtonElement>(selector);
  if (!control || control.disabled) return false;
  control.click();
  return true;
}

function handleGlobalKeyboard(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey || isEditableTarget(event.target)) return;

  if (event.key === 'Escape') {
    const intent = escapeIntent(model.screen, model.pauseMenuOpen);
    if (intent === 'open-pause') openPauseMenu();
    else if (intent === 'close-pause') closePauseMenu();
    else if (intent === 'back') clickShortcut('.back-button[data-screen="menu"]');
    if (intent !== 'none') event.preventDefault();
    return;
  }

  // The table is inert behind the pause board: no gameplay shortcuts while paused.
  if (model.pauseMenuOpen) return;

  const key = event.key.toUpperCase();
  const action = (Object.entries(ACTION_SHORTCUTS).find(([, shortcut]) => shortcut === key)?.[0] ?? null) as PlayerAction | null;
  if (action) {
    const selector = model.screen === 'daily'
      ? `[data-daily-action="${action}"]:not(:disabled)`
      : `[data-action="${action}"]:not(:disabled)`;
    if (clickShortcut(selector)) event.preventDefault();
    return;
  }

  if (key === 'N') {
    if (
      clickShortcut('[data-action="deal"]:not(:disabled)') ||
      clickShortcut('[data-action="start-daily"]:not(:disabled)')
    ) {
      event.preventDefault();
    }
  }
}

function bindGlobalKeyboardOnce(): void {
  if (globalKeyboardBound) return;
  document.addEventListener('keydown', handleGlobalKeyboard);
  globalKeyboardBound = true;
}

const formatChips = (value: number): string =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);

function persistProfile(profile: PlayerProfile): void {
  model.profile = profile;
  saveProfile(profile);
}

function setCardTheme(theme: CardThemeId): void {
  model.visual = { ...model.visual, cardTheme: theme };
  saveVisualPreferences(model.visual);
  setActiveCardTheme(theme);
}

function deckThemeSettingMarkup(): string {
  const preview = (theme: CardThemeId): string =>
    `<span class="deck-theme-preview" aria-hidden="true">${cardMarkup({ rank: 'A', suit: 'spades' }, false, 0, 'standard', theme)}${cardMarkup({ rank: 'K', suit: 'hearts' }, true, 0, 'standard', theme)}</span>`;
  return `
    <div class="setting-row deck-theme-setting">
      <span><strong>Card deck</strong><small>Visual only. Every deck plays exactly the same.</small></span>
      <div class="deck-theme-options" role="group" aria-label="Card deck theme">
        ${CARD_THEME_IDS.map((theme) => `
          <button type="button" class="deck-theme-option" data-card-theme="${theme}" aria-pressed="${model.visual.cardTheme === theme}">
            ${preview(theme)}
            <span>${CARD_THEMES[theme].label}</span>
          </button>`).join('')}
      </div>
    </div>`;
}

function persistPreferences(preferences: FeedbackPreferences): void {
  model.preferences = preferences;
  saveFeedbackPreferences(preferences);
  feedbackEngine.syncAmbience(preferences, true);
}

function feedback(cue: FeedbackCue, vibration: HapticCue | null = 'tap'): void {
  feedbackEngine.play(cue, model.preferences);
  if (vibration) haptic(vibration, model.preferences);
}

function playRoundFeedback(round: RoundState, unlockedCount = 0): void {
  const outcomes = round.results.map((result) => result.outcome);
  if (outcomes.includes('blackjack')) {
    feedback('blackjack', 'blackjack');
  } else if (outcomes.length > 0 && outcomes.every((outcome) => outcome === 'win')) {
    feedback('win', 'result');
  } else if (outcomes.length > 0 && outcomes.every((outcome) => outcome === 'loss')) {
    feedback('loss', 'result');
  } else {
    feedback('flip', 'result');
  }

  if (unlockedCount > 0 && typeof window !== 'undefined') {
    window.setTimeout(() => feedbackEngine.play('achievement', model.preferences), 130);
    haptic('achievement', model.preferences);
  }
}

function say(event: DialogueEvent): void {
  const next = selectDialogue(event, model.dialogueMemory);
  model.commentary = next.selection;
  model.dialogueMemory = next.memory;
  cueFx('line');
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
    <main id="app-main" tabindex="-1" class="screen menu-screen">
      <div class="ambient-lamp ambient-lamp-menu" aria-hidden="true"></div>
      <section class="brand-lockup" aria-labelledby="game-title">
        <div class="brand-kicker"><span></span><p>OFFICIAL INSPIRE PRESENTS</p><span></span></div>
        <h1 id="game-title" aria-label="${APP_NAME}"><span>BLACK</span><em>JAK</em></h1>
        <p class="tagline">${APP_TAGLINE}</p>
        <p class="brand-note">Private table. Fictional chips. Questionable judgment.</p>
      </section>
      ${menuBoardMarkup({
        as: 'nav',
        label: 'BlackJak modes',
        className: 'main-menu-board',
        items: [
          { slot: 'header', label: 'Classic BlackJak', detail: 'Standard rules · 3:2', attributes: 'data-screen="classic"' },
          { slot: 'row1', label: "Jak's House", detail: 'Arcade', attributes: 'data-screen="house"' },
          { slot: 'row2', label: 'Daily Hand', detail: 'Challenge', attributes: 'data-screen="daily"' },
          { slot: 'row3', label: 'Stats', attributes: 'data-screen="stats"' },
          { slot: 'row4', label: 'Settings', attributes: 'data-screen="settings"' },
        ],
      })}
      <div class="menu-progression" aria-label="BlackJak progression">
        <span>${title.current.name}</span>
        <b>${model.profile.rep} REP</b>
      </div>
      <div class="menu-bankroll" aria-label="Saved Classic BlackJak bankroll">Practice chips <strong>${formatChips(model.profile.chips)}</strong></div>
      <p class="fine-print">Fictional practice chips only. No purchases, cash-out, or real-money wagering.</p>
    </main>`;
}

function settingsMarkup(): string {
  const prefs = model.preferences;
  const toggle = (key: 'master' | 'sfx' | 'ambience' | 'haptics', label: string, copy: string): string => `
    <div class="setting-row">
      <span><strong>${label}</strong><small>${copy}</small></span>
      <button class="setting-toggle ${prefs[key] ? 'is-on' : ''}" data-setting-toggle="${key}" aria-pressed="${prefs[key]}">${prefs[key] ? 'ON' : 'OFF'}</button>
    </div>`;

  return `
    <main id="app-main" tabindex="-1" class="screen panel-screen">
      <div class="ambient-lamp" aria-hidden="true"></div>
      <button class="back-button" data-screen="menu" aria-keyshortcuts="Escape">← Menu</button>
      <section class="glass-panel settings-panel">
        <p class="eyebrow">TABLE SETUP</p>
        <h1>Settings</h1>
        <div class="settings-list">
          ${deckThemeSettingMarkup()}
          <div class="setting-row"><span><strong>Motion</strong><small>Animations follow your device's reduced-motion preference.</small></span><b>System</b></div>
          ${toggle('master', 'Master feedback', 'Master switch for synthesized sound and haptic feedback.')}
          ${toggle('sfx', 'Sound effects', 'Cards, chips, buttons, results, and achievement stings.')}
          ${toggle('ambience', 'Room ambience', 'Very quiet synthesized table-room hum after a user gesture.')}
          ${toggle('haptics', 'Haptics', 'Defensive mobile vibration feedback where supported.')}
          <div class="setting-row volume-setting">
            <span><strong>Volume</strong><small>Synthesized sound level. The game remains fully usable muted.</small></span>
            <label><span>${Math.round(prefs.volume * 100)}%</span><input type="range" min="0" max="100" step="5" value="${Math.round(prefs.volume * 100)}" data-setting-volume aria-label="Sound volume"></label>
          </div>
          <div class="setting-row"><span><strong>Dealer commentary</strong><small>Reactive Jak lines are enabled and never block play.</small></span><b>On</b></div>
          <div class="setting-row"><span><strong>Classic rules</strong><small>3:2 blackjack · dealer stands on soft 17.</small></span><b>Locked</b></div>
        </div>
        <p class="panel-footnote">Browser autoplay rules require a tap/click before audio can begin. No external audio files are used in this build.</p>
      </section>
    </main>`;
}

function statsMarkup(): string {
  const stats = model.profile.stats;
  const title = titleProgressForRep(model.profile.rep);
  const unlocked = new Set(model.profile.progression.unlockedAchievements);
  const winRate = stats.totalHands > 0 ? Math.round((stats.wins / stats.totalHands) * 100) : 0;
  return `
    <main id="app-main" tabindex="-1" class="screen panel-screen">
      <button class="back-button" data-screen="menu" aria-keyshortcuts="Escape">← Menu</button>
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
          ${statCard('Win rate', `${winRate}%`)}
          ${statCard('Doubles', stats.doublesAttempted)}
          ${statCard('Doubles won', stats.doublesWon)}
          ${statCard('Splits', stats.splitsAttempted)}
          ${statCard('Split sweeps', stats.splitSweeps)}
          ${statCard('Busts', stats.busts)}
          ${statCard('Longest win streak', stats.longestWinStreak)}
          ${statCard('Longest loss streak', stats.longestLossStreak)}
          ${statCard('Peak chips', formatChips(stats.highestChipBalance))}
          ${statCard('Lifetime REP', stats.lifetimeRep)}
          ${statCard('Risky hits 16+', stats.riskyHits)}
          ${statCard('Five-card wins', stats.fiveCardWins)}
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
        <section class="player-hand ${active ? 'is-active' : ''} ${evaluation.isBust ? 'is-bust' : ''} ${outcomeClass(round, hand)}" aria-label="Player hand ${index + 1}${active ? ', active' : ''}, total ${evaluation.total}, wager ${formatChips(hand.wager)} chips, ${handResultLabel(round, hand).toLowerCase()}">
          <div class="hand-meta">
            <span>HAND ${index + 1}${round.hands.length > 1 ? ` / ${round.hands.length}` : ''}</span>
            <strong>${evaluation.total}</strong>
            <span class="hand-wager">${formatChips(hand.wager)} chips</span>
          </div>
          <div class="cards">${hand.cards.map((card, cardIndex) => {
            const fresh = cardIsNew(`p:${index}:${cardIndex}:${card.rank}${card.suit}`);
            return cardMarkup(card, false, fresh ? cardIndex + index * 2 : 0, house && isGoldCard(house, hand.id, cardIndex) ? 'gold' : 'standard', undefined, fresh);
          }).join('')}</div>
          <span class="hand-state">${handResultLabel(round, hand)}</span>
        </section>`;
    }).join('')}
  </div>`;
}

const RESULT_TITLES: Record<Exclude<RoundTone, 'idle' | 'playing'>, string> = {
  blackjack: 'BLACKJAK',
  win: 'PAID',
  loss: 'BUSTED',
  push: 'PUSH',
  mixed: 'SPLIT DECISION',
};

/** Status/result line for the dialogue panel, derived from existing round + reward state. */
function panelStatus(view: TableView, house: boolean): PanelStatus {
  const { round, tone } = view;
  if (!round || round.phase !== 'resolved' || tone === 'idle' || tone === 'playing') {
    return { tone, text: statusText(round) };
  }

  const net = round.results.reduce((sum, result) => sum + result.net, 0);
  const netLabel = net === 0 ? '±0 chips' : `${net > 0 ? '+' : ''}${formatChips(net)} chips`;
  const detail = round.results.length > 1
    ? ` · ${round.results.map((result, index) => `H${index + 1} ${result.outcome.toUpperCase()}`).join(' · ')}`
    : '';
  const tags = [
    model.lastRepEarned > 0 ? `+${model.lastRepEarned} REP` : '',
    house && model.houseLastBonusRep > 0 ? `HOT HAND +${model.houseLastBonusRep} REP` : '',
    house && model.houseTokenAwarded ? 'RUN IT BACK TOKEN EARNED' : '',
  ].filter(Boolean);

  return { tone, title: RESULT_TITLES[tone], text: `${netLabel}${detail}`, tags };
}

function houseModifierStripMarkup(): string {
  const nextGoldIn = model.house.roundNumber % 3 === 0 ? 3 : 3 - (model.house.roundNumber % 3);
  const nextHotMultiplier = hotHandMultiplier(model.house.hotHandStreak + 1);
  const goldActive = Boolean(model.round && model.house.goldRound);

  const statusById: Record<string, string> = {
    'gold-card': goldActive ? 'ACTIVE' : `IN ${nextGoldIn}`,
    'run-it-back': `${model.house.runItBackTokens} TOKEN${model.house.runItBackTokens === 1 ? '' : 'S'}`,
    'hot-hand': `NEXT ×${nextHotMultiplier.toFixed(2)} REP`,
  };

  return `
    <section class="house-strip" aria-labelledby="house-mode-title">
      <h1 id="house-mode-title" class="visually-hidden">Jak's House</h1>
      <ul class="house-modifier-pills" aria-label="Jak's House active modifier rules">
        ${HOUSE_MODIFIERS.map((modifier) => `
          <li class="house-modifier-pill${modifier.id === 'gold-card' && goldActive ? ' is-active' : ''}"><span>${modifier.name}</span><strong>${statusById[modifier.id]}</strong></li>`).join('')}
      </ul>
      <details class="house-rules">
        <summary>Arcade rules · not standard blackjack</summary>
        <p>Blackjack-inspired arcade play. House modifiers can change a hand, but Classic BlackJak remains standard and separate.</p>
        <ul>${HOUSE_MODIFIERS.map((modifier) => `<li><b>${modifier.name}.</b> ${modifier.shortDescription}</li>`).join('')}</ul>
      </details>
    </section>`;
}

function tableDockFor(view: TableView, house: boolean): string {
  const { round } = view;
  const phase = dockPhaseFor(round?.phase ?? null, model.profile.chips);
  const activeHand = round && round.phase === 'player-turn' ? getActiveHand(round) : null;
  return tableDockMarkup({
    phase,
    stakeOptions: STAKE_OPTIONS,
    selectedStake: normalizedStake(),
    chips: model.profile.chips,
    maxStake: MAX_STAKE,
    allowed: activeHand ? allowedActions(activeHand, model.profile.chips, round?.hands.length) : [],
    wager: activeHand ? `${formatChips(activeHand.wager)} chips` : undefined,
    handLabel: round && round.hands.length > 1 ? `HAND ${round.activeHandIndex + 1}/${round.hands.length}` : 'IN PLAY',
    runItBack: house && model.house.replayAvailable && model.house.currentStake
      ? { tokens: model.house.runItBackTokens, stake: `${formatChips(model.house.currentStake)} chips` }
      : null,
    error: model.error,
    house,
    formatChips,
    fx: currentFx,
  });
}

interface TableView {
  readonly round: RoundState | null;
  readonly revealDealer: boolean;
  readonly dealerTotal: string | number;
  readonly showActions: boolean;
  readonly tone: RoundTone;
}

function tableView(): TableView {
  const round = model.round;
  const dealerCards = round?.dealer ?? [];
  const revealDealer = round?.phase === 'resolved';
  return {
    round,
    revealDealer,
    dealerTotal: dealerCards.length ? (revealDealer ? evaluateHand(dealerCards).total : '?') : '—',
    showActions: round?.phase === 'player-turn',
    tone: roundTone(round),
  };
}

function sceneHudMarkup(modePill = ''): string {
  const progression = titleProgressForRep(model.profile.rep);
  const theme = model.visual.cardTheme;
  return `
    <header class="table-header table-hud">
      <button type="button" class="back-button pause-button" data-pause="open" aria-haspopup="dialog" aria-expanded="${model.pauseMenuOpen}" aria-keyshortcuts="Escape"><span aria-hidden="true">☰</span> <span class="hud-label">Menu</span></button>
      <div class="hud" aria-label="Player resources and progression">
        ${modePill}
        <span class="hud-chips">CHIPS <strong>${formatChips(model.profile.chips)}</strong></span>
        <span class="rep-pill"><span class="title-pill">${progression.current.name}</span> <strong>${model.profile.rep}</strong> REP<i class="rep-mini-track" aria-hidden="true"><i style="width:${progression.percent}%"></i></i></span>
      </div>
      <button type="button" class="hud-deck" data-deck-cycle aria-label="Card deck: ${CARD_THEMES[theme].label}. Change deck">
        <span class="hud-deck-back" aria-hidden="true">${cardMarkup({ rank: 'A', suit: 'spades' }, true, 0, 'standard', theme, false)}</span>
        <span class="hud-label">${CARD_THEMES[theme].label}</span>
      </button>
    </header>`;
}

function dealerNpcMarkup(house: boolean): string {
  return dealerMarkup({ event: model.commentary.event, seed: model.commentary.text, action: model.dealerCue, house });
}

function dealerHandMarkup(view: TableView): string {
  const dealerCards = view.round?.dealer ?? [];
  return `
    <div class="dealer-hand-row">
      <div class="cards dealer-cards" aria-label="Dealer cards">${dealerCards.map((card, index) => {
        const hidden = index === 1 && !view.revealDealer;
        const fresh = cardIsNew(`d:${index}:${hidden ? 'hidden' : `${card.rank}${card.suit}`}`);
        // The hole card that was face-down last render flips over instead of re-dealing.
        const reveal = fresh && !hidden && wasRenderedHidden(`d:${index}:hidden`);
        return cardMarkup(card, hidden, fresh ? index : 0, 'standard', undefined, reveal ? 'flip' : fresh);
      }).join('')}</div>
      ${dealerCards.length ? `<strong class="dealer-total" aria-label="${view.revealDealer ? `Dealer total ${view.dealerTotal}` : 'Dealer total hidden'}">${view.dealerTotal}</strong>` : ''}
    </div>`;
}

function sceneDialogueMarkup(view: TableView, house: boolean): string {
  return dialoguePanelMarkup({
    speaker: 'JAK',
    context: house ? "HOUSE RULES ACTIVE" : 'HOUSE DEALER',
    line: model.commentary.text,
    event: model.commentary.event,
    status: panelStatus(view, house),
    house,
  });
}

function classicMarkup(): string {
  const view = tableView();
  const { round } = view;

  return `
    <main id="app-main" tabindex="-1" class="screen table-screen round-${view.tone} ${fxClassNames(currentFx)}" style="${fxStyleVars()}">
      <div class="ambient-lamp ambient-lamp-table" aria-hidden="true"></div>
      ${gameSceneMarkup({
        mode: 'classic',
        label: 'Classic BlackJak table',
        hud: sceneHudMarkup(),
        npc: dealerNpcMarkup(false),
        dealerHand: dealerHandMarkup(view),
        playerHands: playerHandsMarkup(round),
        dialogue: sceneDialogueMarkup(view, false),
      })}

      <h1 class="visually-hidden">Classic BlackJak</h1>
      ${tableDockFor(view, false)}
      ${achievementToastMarkup()}
    </main>`;
}

function houseMarkup(): string {
  const view = tableView();
  const { round } = view;

  return `
    <main id="app-main" tabindex="-1" class="screen table-screen house-screen round-${view.tone} ${fxClassNames(currentFx)}" style="${fxStyleVars()}">
      <div class="ambient-lamp ambient-lamp-table house-lamp" aria-hidden="true"></div>
      ${gameSceneMarkup({
        mode: 'house',
        label: "Jak's House arcade blackjack table",
        hud: sceneHudMarkup(`<span class="house-hud-pill">HOUSE <strong>H${model.house.roundNumber || '—'}</strong></span>`),
        npc: dealerNpcMarkup(true),
        dealerHand: dealerHandMarkup(view),
        playerHands: playerHandsMarkup(round, model.house),
        dialogue: sceneDialogueMarkup(view, true),
      })}

      ${houseModifierStripMarkup()}
      ${tableDockFor(view, true)}
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
  cueFx('result', ...(progression.unlocked.length ? ['achievement' as const] : []));
  say(resolutionDialogueEvent(model.round));
  playRoundFeedback(model.round, progression.unlocked.length);
}

function settleHouseIfResolved(): void {
  if (!model.round || model.round.phase !== 'resolved') return;

  const settled = settleResults(model.profile, model.round.results);
  const progression = applyProgression(settled, model.round, model.roundProgress);
  const houseResolution = completeHouseRound(model.house, model.round, progression.repEarned);
  const withHouseBonus = applyRepBonus(progression.profile, houseResolution.hotHandBonusRep);

  persistProfile(withHouseBonus);
  model.house = houseResolution.house;
  model.houseCheckpoint = null;
  model.houseLastBonusRep = houseResolution.hotHandBonusRep;
  model.houseTokenAwarded = houseResolution.tokenAwarded;
  model.lastRepEarned = progression.repEarned + houseResolution.hotHandBonusRep;
  model.achievementToasts = [...model.achievementToasts, ...progression.unlocked];
  cueFx('result', ...(progression.unlocked.length ? ['achievement' as const] : []));
  say(resolutionDialogueEvent(model.round));
  playRoundFeedback(model.round, progression.unlocked.length);
}

function dealRound(): void {
  if (model.round && model.round.phase !== 'resolved') throw new Error('Finish the current hand before dealing again.');
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
      cueFx('achievement');
    }
  }

  const before = model.profile;
  const reserved = reserveStake(before, stake);
  model.profile = reserved;

  try {
    model.round = startRound(stake);
    model.roundSerial += 1;
    cueFx('deal');
    model.dealerCue = 'deal';
    feedback('deal', 'deal');
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
  if (model.round && model.round.phase !== 'resolved') throw new Error('Finish the current House hand before dealing again.');
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
      cueFx('achievement');
    }
  }

  const beforeProfile = model.profile;
  const beforeHouse = model.house;
  model.houseCheckpoint = beforeHouse;
  model.profile = reserveStake(beforeProfile, stake);

  try {
    const started = startHouseRound(stake, model.house);
    model.house = started.house;
    model.round = started.round;
    model.roundSerial += 1;
    cueFx('deal');
    model.dealerCue = 'deal';
    feedback('deal', 'deal');

    if (model.round.phase === 'resolved') {
      settleHouseIfResolved();
    } else {
      say('idle');
    }
  } catch (error) {
    persistProfile(beforeProfile);
    model.house = beforeHouse;
    model.houseCheckpoint = null;
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
  model.houseCheckpoint = beforeHouse;
  try {
    const replay = replayHouseRound(model.house);
    model.house = replay.house;
    model.round = replay.round;
    model.roundSerial += 1;
    cueFx('deal');
    model.dealerCue = 'deal';
    feedback('deal', 'deal');

    if (model.round.phase === 'resolved') {
      settleHouseIfResolved();
    } else {
      say('idle');
    }
  } catch (error) {
    model.house = beforeHouse;
    model.houseCheckpoint = null;
    throw error;
  }
}

/** Visual gesture for a player action; stand has no gesture. */
function dealerCueForAction(action: PlayerAction): DealerAction | null {
  if (action === 'hit') return 'draw';
  if (action === 'double') return 'chips';
  if (action === 'split') return 'deal';
  return null;
}

function takePlayerAction(action: PlayerAction): void {
  if (!model.round || model.round.phase !== 'player-turn') throw new Error('Deal a hand first.');

  const hand = getActiveHand(model.round);
  const startingTotal = evaluateHand(hand.cards).total;
  const activeHandId = hand.id;
  if (action === 'hit' && startingTotal === 20) model.roundProgress.hitOn20 = true;
  const before = model.profile;
  const additionalStake = action === 'double' || action === 'split' ? hand.wager : 0;

  if (!allowedActions(hand, before.chips, model.round.hands.length).includes(action)) {
    throw new Error(`Action "${action}" is not currently allowed.`);
  }

  if (action === 'hit' && startingTotal >= 16) model.roundProgress.riskyHits = (model.roundProgress.riskyHits ?? 0) + 1;
  if (action === 'double') model.roundProgress.doublesAttempted = (model.roundProgress.doublesAttempted ?? 0) + 1;
  if (action === 'split') model.roundProgress.splitsAttempted = (model.roundProgress.splitsAttempted ?? 0) + 1;

  if (action === 'hit') feedback('flip', 'tap');
  else if (action === 'double' || action === 'split') feedback('chip', 'tap');
  else feedback('button', 'tap');

  if (additionalStake > 0) model.profile = reserveStake(before, additionalStake);

  try {
    const updatedRound = performAction(model.round, action, before.chips);
    model.round = updatedRound;
    model.dealerCue = dealerCueForAction(action);
    cueFx(`action:${action}`);

    if (action === 'hit') {
      const updatedHand = updatedRound.hands.find((candidate) => candidate.id === activeHandId);
      if (updatedHand && !evaluateHand(updatedHand.cards).isBust && startingTotal >= 16) {
        model.roundProgress.riskyHitSurvived = true;
      }
    }

    if (updatedRound.phase === 'resolved') {
      settleIfResolved();
    } else if (action === 'split') {
      say('split_started');
    } else if (action === 'hit') {
      const updatedHand = model.round.hands.find((candidate) => candidate.id === activeHandId);
      if (updatedHand) {
        const updated = evaluateHand(updatedHand.cards);
        if (updated.isBust) {
          say('player_bust');
          cueFx('bust');
        } else if (startingTotal >= 17 && startingTotal <= 20) {
          say(`hit_${startingTotal}` as DialogueEvent);
        } else if (startingTotal >= 16) {
          say('survived_risky_hit');
        }
      }
    }
  } catch (error) {
    if (additionalStake > 0) model.profile = before;
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

  if (!allowedActions(hand, before.chips, model.round.hands.length).includes(action)) {
    throw new Error(`Action "${action}" is not currently allowed.`);
  }

  if (action === 'hit' && startingTotal >= 16) model.roundProgress.riskyHits = (model.roundProgress.riskyHits ?? 0) + 1;
  if (action === 'double') model.roundProgress.doublesAttempted = (model.roundProgress.doublesAttempted ?? 0) + 1;
  if (action === 'split') model.roundProgress.splitsAttempted = (model.roundProgress.splitsAttempted ?? 0) + 1;

  if (action === 'hit') feedback('flip', 'tap');
  else if (action === 'double' || action === 'split') feedback('chip', 'tap');
  else feedback('button', 'tap');

  if (additionalStake > 0) model.profile = reserveStake(before, additionalStake);

  try {
    const updatedRound = performAction(model.round, action, before.chips);
    model.round = updatedRound;
    model.dealerCue = dealerCueForAction(action);
    cueFx(`action:${action}`);

    if (action === 'hit') {
      const updatedHand = updatedRound.hands.find((candidate) => candidate.id === activeHandId);
      if (updatedHand && !evaluateHand(updatedHand.cards).isBust && startingTotal >= 16) {
        model.roundProgress.riskyHitSurvived = true;
      }
    }

    if (updatedRound.phase === 'resolved') {
      settleHouseIfResolved();
    } else if (action === 'split') {
      say('split_started');
    } else if (action === 'hit') {
      const updatedHand = model.round.hands.find((candidate) => candidate.id === activeHandId);
      if (updatedHand) {
        const updated = evaluateHand(updatedHand.cards);
        if (updated.isBust) {
          say('player_bust');
          cueFx('bust');
        } else if (startingTotal >= 17 && startingTotal <= 20) {
          say(`hit_${startingTotal}` as DialogueEvent);
        } else if (startingTotal >= 16) {
          say('survived_risky_hit');
        }
      }
    }
  } catch (error) {
    if (additionalStake > 0) model.profile = before;
    throw error;
  }
}

function dailyOutcome(round: RoundState): DailyOutcome {
  if (round.results.length === 1 && round.results[0]?.outcome === 'blackjack') return 'blackjack';
  const net = round.results.reduce((sum, result) => sum + result.net, 0);
  if (net > 0) return 'win';
  if (net < 0) return 'loss';
  return 'push';
}

function prepareDailyRound(): void {
  model.dailyDateKey = localDateKey();
  const state = dailyStateForDate(model.profile.daily, model.dailyDateKey);
  if (state.completed) {
    model.dailyRound = null;
    return;
  }
  model.dailyRound = createDailyChallenge(model.dailyDateKey).round;
  // New card-animation scope, so the Daily hand deals in even if a table hand showed the same cards.
  model.roundSerial += 1;
  model.lastRepEarned = 0;
  model.dailyShareStatus = null;
}

function completeDailyIfResolved(): void {
  if (!model.dailyRound || model.dailyRound.phase !== 'resolved') return;
  const outcome = dailyOutcome(model.dailyRound);
  const completed = completeDailyChallenge(model.profile, model.dailyDateKey, outcome);
  persistProfile(completed.profile);
  model.lastRepEarned = completed.repAwarded;
  playRoundFeedback(model.dailyRound, 0);
}

function takeDailyAction(action: PlayerAction): void {
  if (!model.dailyRound || model.dailyRound.phase !== 'player-turn') throw new Error('Today\'s Daily Hand is not active.');
  const hand = getActiveHand(model.dailyRound);
  if (!allowedActions(hand, Number.POSITIVE_INFINITY, model.dailyRound.hands.length).includes(action)) throw new Error(`Action "${action}" is not available.`);

  if (action === 'hit') feedback('flip', 'tap');
  else if (action === 'double' || action === 'split') feedback('chip', 'tap');
  else feedback('button', 'tap');

  model.dailyRound = performAction(model.dailyRound, action, Number.POSITIVE_INFINITY);
  completeDailyIfResolved();
}

function dailyControlsMarkup(round: RoundState): string {
  const hand = getActiveHand(round);
  const valid = allowedActions(hand, Number.POSITIVE_INFINITY, round.hands.length);
  return `
    <div class="action-bar daily-action-bar" aria-label="Daily Hand actions">
      ${(['hit', 'stand', 'double', 'split'] as PlayerAction[])
        .map((action) => `<button data-daily-action="${action}" aria-label="${action.toUpperCase()}" aria-keyshortcuts="${ACTION_SHORTCUTS[action]}" ${valid.includes(action) ? '' : 'disabled'}>${action.toUpperCase()}</button>`)
        .join('')}
    </div>`;
}

function dailyMarkup(): string {
  const today = localDateKey();
  if (model.dailyDateKey !== today) {
    model.dailyDateKey = today;
    model.dailyRound = null;
    model.dailyShareStatus = null;
    model.lastRepEarned = 0;
  }
  const state = dailyStateForDate(model.profile.daily, today);
  const challenge = createDailyChallenge(today);
  const round = model.dailyRound;
  const displayRound = round ?? challenge.round;
  const revealDealer = Boolean(round?.phase === 'resolved');
  const dealerCards = displayRound.dealer;
  const playerHand = displayRound.hands[0];
  const completed = state.completed;
  const result = completed && state.outcome ? state.outcome.toUpperCase() : null;

  return `
    <main id="app-main" tabindex="-1" class="screen panel-screen daily-screen">
      <div class="ambient-lamp" aria-hidden="true"></div>
      <button class="back-button" data-screen="menu" aria-keyshortcuts="Escape">← Menu</button>
      <section class="glass-panel daily-panel">
        <div class="daily-heading">
          <div><p class="eyebrow">DAILY HAND · ${today}</p><h1>Same Table. Same Problem.</h1></div>
          <span>+75 REP · ONCE TODAY</span>
        </div>
        <p class="daily-policy">The date + game version deterministically creates today's opening hand. Reloading before resolution regenerates the same challenge; once resolved, today's REP reward is locked.</p>
        ${model.error ? `<p class="error-line" role="alert">${escapeHtml(model.error)}</p>` : ''}
        <div class="daily-table">
          <section>
            <span>DEALER UP-CARD</span>
            <div class="cards">${cardMarkup(dealerCards[0], false, 0)}${round ? cardMarkup(dealerCards[1], !revealDealer, 1) : ''}</div>
          </section>
          <div class="daily-vs">VS</div>
          <section class="daily-player-zone">
            <span>YOUR HAND</span>
            ${round ? playerHandsMarkup(round) : `<div class="daily-starting-hand"><strong>${evaluateHand(playerHand.cards).total}</strong><div class="cards">${playerHand.cards.map((card,index)=>cardMarkup(card,false,index)).join('')}</div></div>`}
          </section>
        </div>
        ${completed && !round ? `
          <div class="daily-complete">
            <small>TODAY'S RESULT</small><strong>${result}</strong>
            <p>Daily streak: ${state.currentStreak} day${state.currentStreak === 1 ? '' : 's'} · Reward already claimed.</p>
            <button class="primary-action" data-action="share-daily">Share Result</button>
          </div>` : ''}
        ${round ? `
          <div class="daily-live">
            <p class="status-line" role="status" aria-live="polite" aria-atomic="true">${round.phase === 'resolved' ? `RESULT: ${dailyOutcome(round).toUpperCase()}${model.lastRepEarned ? ` · +${model.lastRepEarned} REP` : ''}` : `Your move · ${evaluateHand(getActiveHand(round).cards).total}`}</p>
            ${round.phase === 'player-turn' ? dailyControlsMarkup(round) : '<button class="primary-action" data-action="share-daily">Share Result</button>'}
          </div>` : ''}
        ${!completed && !round ? '<button class="primary-action" data-action="start-daily">Play Today\'s Hand</button>' : ''}
        ${model.dailyShareStatus ? `<p class="daily-share-status" role="status">${escapeHtml(model.dailyShareStatus)}</p>` : ''}
      </section>
    </main>`;
}

async function shareDailyResult(): Promise<void> {
  const text = dailyShareText(model.profile, model.dailyDateKey);
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share({ text, title: 'BlackJak Daily Hand' });
      model.dailyShareStatus = 'Shared.';
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      model.dailyShareStatus = 'Result copied to clipboard.';
    } else {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.append(area);
      area.select();
      const copied = document.execCommand('copy');
      area.remove();
      model.dailyShareStatus = copied ? 'Result copied to clipboard.' : 'Copy is unavailable in this browser.';
    }
  } catch {
    model.dailyShareStatus = 'Share cancelled or unavailable.';
  }
  render();
}

function goToScreen(screen: AppScreen): void {
  model.pauseMenuOpen = false;
  model.pauseConfirmLeave = false;
  if (screen === 'menu' && isTableScreen(model.screen) && model.round?.phase !== 'resolved') {
    // Abandoning an unfinished hand: the reserved stake was never saved, so nothing is charged.
    model.profile = loadProfile();
    model.selectedStake = model.profile.chips > 0 ? Math.min(model.selectedStake || 25, model.profile.chips) : 0;
    if (model.screen === 'house' && model.houseCheckpoint) {
      model.house = model.houseCheckpoint;
      model.houseCheckpoint = null;
    }
  }
  if ((screen === 'classic' || screen === 'house') && screen !== model.screen) {
    model.round = null;
    model.roundProgress = emptyRoundProgressionContext();
    model.achievementToasts = [];
    model.lastRepEarned = 0;
    model.houseLastBonusRep = 0;
    model.houseTokenAwarded = false;
    say(model.profile.stats.totalHands > 0 ? 'return_player' : 'game_start');
    cueFx('panel');
  }
  if (screen === 'daily' && screen !== model.screen) {
    prepareDailyRound();
    if (model.dailyRound) feedback('deal', 'deal');
  }
  model.screen = screen;
  model.error = null;
  feedbackEngine.syncAmbience(model.preferences, true);
  render();
}

const handInProgress = (): boolean => Boolean(model.round && model.round.phase !== 'resolved');

function pauseOverlayMarkup(): string {
  const progression = titleProgressForRep(model.profile.rep);
  return pauseMenuMarkup({
    modeLabel: model.screen === 'house' ? "Jak's House" : 'Classic',
    chips: formatChips(model.profile.chips),
    rep: model.profile.rep,
    title: progression.current.name,
    handInProgress: handInProgress(),
    confirmLeave: model.pauseConfirmLeave,
    deckLabel: CARD_THEMES[model.visual.cardTheme].label,
    soundOn: model.preferences.master,
  });
}

/**
 * Mounts (or refreshes) the pause board beside the table without re-rendering
 * the table, so cards don't replay their deal animation and the round is untouched.
 */
function mountPauseOverlay(focusAction: string | null = 'resume'): void {
  const root = app();
  root.querySelector('.pause-overlay')?.remove();
  const main = root.querySelector<HTMLElement>('#app-main');
  if (!model.pauseMenuOpen || !isTableScreen(model.screen)) {
    if (main) main.inert = false;
    return;
  }
  root.insertAdjacentHTML('beforeend', pauseOverlayMarkup());
  if (main) main.inert = true;
  root.querySelector('[data-pause="open"]')?.setAttribute('aria-expanded', 'true');
  bindPauseEvents();
  if (focusAction) root.querySelector<HTMLElement>(`.pause-overlay [data-pause-action="${focusAction}"].menu-board-item`)?.focus({ preventScroll: true });
}

function openPauseMenu(): void {
  if (!isTableScreen(model.screen) || model.pauseMenuOpen) return;
  model.pauseMenuOpen = true;
  model.pauseConfirmLeave = false;
  mountPauseOverlay('resume');
}

function closePauseMenu(): void {
  if (!model.pauseMenuOpen) return;
  model.pauseMenuOpen = false;
  model.pauseConfirmLeave = false;
  mountPauseOverlay(null);
  const toggle = app().querySelector<HTMLElement>('[data-pause="open"]');
  toggle?.setAttribute('aria-expanded', 'false');
  toggle?.focus({ preventScroll: true });
}

function bindPauseEvents(): void {
  app().querySelectorAll<HTMLElement>('.pause-overlay [data-pause-action]').forEach((element) => {
    element.addEventListener('click', () => {
      if (!element.isConnected) return;
      feedbackEngine.activate();
      const action = element.dataset.pauseAction;
      if (action === 'resume') {
        feedback('button', 'tap');
        closePauseMenu();
      } else if (action === 'deck') {
        const index = CARD_THEME_IDS.indexOf(model.visual.cardTheme);
        setCardTheme(CARD_THEME_IDS[(index + 1) % CARD_THEME_IDS.length]);
        feedback('button', 'tap');
        // Cards change, so the table re-renders; static mode skips deal animations.
        render({ staticTable: true });
      } else if (action === 'sound') {
        persistPreferences({ ...model.preferences, master: !model.preferences.master });
        feedback('button', 'tap');
        mountPauseOverlay('sound');
      } else if (action === 'menu') {
        feedback('button', 'tap');
        if (handInProgress() && !model.pauseConfirmLeave) {
          model.pauseConfirmLeave = true;
          mountPauseOverlay('menu');
        } else {
          goToScreen('menu');
        }
      }
    });
  });
}

interface RenderOptions {
  /** Re-render without replaying card deal / dealer entrance animations. */
  readonly staticTable?: boolean;
}

/** Pointer tap (detail > 0) landing right after the controls changed shape. */
function isStaleTap(event: MouseEvent): boolean {
  return shouldIgnoreActivation({ now: event.timeStamp, controlsChangedAt, pointer: event.detail > 0 });
}

function render(options: RenderOptions = {}): void {
  currentFx = fxQueue.consume();
  const previousScreen = lastRenderedScreen;
  const activeBeforeRender = document.activeElement;
  const hadInteractiveFocus = activeBeforeRender instanceof HTMLElement && activeBeforeRender !== document.body;
  const focusKey = captureFocusKey();

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
    case 'daily':
      app().innerHTML = dailyMarkup();
      break;
    case 'stats':
      app().innerHTML = statsMarkup();
      break;
    case 'settings':
      app().innerHTML = settingsMarkup();
      break;
  }

  // Dealer gestures are one-shot: later re-renders show the dialogue pose only.
  model.dealerCue = null;
  app().querySelector('#app-main')?.classList.toggle('is-static-render', Boolean(options.staticTable));
  renderedCardKeys = pendingCardKeys;
  pendingCardKeys = new Set<string>();
  const dockPhase = (app().querySelector('.table-dock')?.className.match(/phase-(\w+)/)?.[1] ?? null) as DockPhase | null;
  const controlsState = controlsStateKey({
    screen: model.screen,
    dockPhase,
    dailyPhase: model.dailyRound?.phase,
    dailyHandIndex: model.dailyRound?.activeHandIndex,
  });
  if (controlsState !== lastControlsState) {
    controlsChangedAt = performance.now();
    lastControlsState = controlsState;
  }
  currentFx = new Set();
  bindEvents();
  if (model.pauseMenuOpen) mountPauseOverlay(null);
  const screenChanged = previousScreen !== null && previousScreen !== model.screen;
  lastRenderedScreen = model.screen;
  focusAfterRender(focusKey, screenChanged, hadInteractiveFocus);
}

function bindEvents(): void {
  document.querySelectorAll<HTMLElement>('[data-screen]').forEach((element) => {
    element.addEventListener('click', () => {
      if (!element.isConnected) return;
      const screen = element.dataset.screen as AppScreen | undefined;
      if (!screen) return;
      feedbackEngine.activate();
      feedback('button', 'tap');
      goToScreen(screen);
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-deck-cycle]').forEach((element) => {
    element.addEventListener('click', () => {
      if (!element.isConnected) return;
      feedbackEngine.activate();
      const index = CARD_THEME_IDS.indexOf(model.visual.cardTheme);
      setCardTheme(CARD_THEME_IDS[(index + 1) % CARD_THEME_IDS.length]);
      feedback('button', 'tap');
      render({ staticTable: true });
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-pause="open"]').forEach((element) => {
    element.addEventListener('click', () => {
      if (!element.isConnected) return;
      feedbackEngine.activate();
      feedback('button', 'tap');
      openPauseMenu();
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-stake]').forEach((element) => {
    element.addEventListener('click', (event) => {
      if (!element.isConnected || isStaleTap(event)) return;
      feedbackEngine.activate();
      const stake = element.dataset.stake;
      const next = stake === 'max' ? Math.min(model.profile.chips, MAX_STAKE) : Number(stake);
      if (Number.isFinite(next) && next > 0 && next <= model.profile.chips) {
        model.selectedStake = next;
        model.error = null;
        cueFx('stake', `stake:${stake}`);
        feedback('chip', 'tap');
        render();
      }
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-setting-toggle]').forEach((element) => {
    element.addEventListener('click', () => {
      if (!element.isConnected) return;
      feedbackEngine.activate();
      const key = element.dataset.settingToggle as 'master' | 'sfx' | 'ambience' | 'haptics' | undefined;
      if (!key) return;
      const next = { ...model.preferences, [key]: !model.preferences[key] };
      persistPreferences(next);
      feedback('button', 'tap');
      render();
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-card-theme]').forEach((element) => {
    element.addEventListener('click', () => {
      if (!element.isConnected) return;
      feedbackEngine.activate();
      const theme = element.dataset.cardTheme;
      if (!theme || !(CARD_THEME_IDS as readonly string[]).includes(theme)) return;
      setCardTheme(theme as CardThemeId);
      feedback('button', 'tap');
      render();
    });
  });

  document.querySelectorAll<HTMLInputElement>('[data-setting-volume]').forEach((element) => {
    element.addEventListener('input', () => {
      const value = Math.max(0, Math.min(100, Number(element.value))) / 100;
      persistPreferences({ ...model.preferences, volume: value });
      const label = element.previousElementSibling;
      if (label) label.textContent = `${Math.round(value * 100)}%`;
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-daily-action]').forEach((element) => {
    element.addEventListener('click', (event) => {
      if (!element.isConnected || isStaleTap(event)) return;
      feedbackEngine.activate();
      model.error = null;
      try {
        const action = element.dataset.dailyAction as PlayerAction | undefined;
        if (action) takeDailyAction(action);
      } catch (error) {
        model.error = error instanceof Error ? error.message : 'Unexpected Daily Hand error.';
      }
      render();
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((element) => {
    element.addEventListener('click', (event) => {
      if (!element.isConnected || isStaleTap(event)) return;
      feedbackEngine.activate();
      const action = element.dataset.action;
      model.error = null;
      try {
        if (action === 'deal') {
          if (model.screen === 'house') dealHouseRound();
          else dealRound();
        } else if (action === 'start-daily') {
          prepareDailyRound();
          feedback('deal', 'deal');
        } else if (action === 'share-daily') {
          void shareDailyResult();
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
          feedback('chip', 'result');
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
  bindGlobalKeyboardOnce();
  render();
}
