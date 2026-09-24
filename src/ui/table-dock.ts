import type { PlayerAction } from '../game';

/*
 * Bottom action dock for Classic and Jak's House: stake chips + the primary
 * actions in one compact, fixed-height strip. Pure markup; every button keeps
 * the data-* attributes and aria-keyshortcuts the existing handlers and
 * keyboard shortcuts use. Fictional practice chips only: no purchase, deposit,
 * cash-out or operator UI exists here.
 */

export const ACTION_SHORTCUTS: Readonly<Record<PlayerAction, string>> = {
  hit: 'H',
  stand: 'S',
  double: 'D',
  split: 'P',
};

export const DOCK_ACTIONS: readonly PlayerAction[] = ['hit', 'stand', 'double', 'split'];

export type DockPhase = 'betting' | 'playing' | 'resolved' | 'broke';

export interface DockInput {
  readonly phase: DockPhase;
  readonly stakeOptions: readonly number[];
  readonly selectedStake: number;
  readonly chips: number;
  readonly maxStake: number;
  /** Actions currently allowed for the active hand (playing phase). */
  readonly allowed: readonly PlayerAction[];
  /** Chips riding on the active hand (playing phase). */
  readonly wager?: string;
  readonly handLabel?: string;
  readonly runItBack?: { readonly tokens: number; readonly stake: string } | null;
  readonly error?: string | null;
  readonly house: boolean;
  readonly formatChips: (value: number) => string;
  /** One-shot game-feel cues for this render (see fx.ts). */
  readonly fx?: ReadonlySet<string>;
}

export function dockPhaseFor(roundPhase: string | null, chips: number): DockPhase {
  if (roundPhase === 'player-turn') return 'playing';
  if (chips <= 0) return 'broke';
  return roundPhase === 'resolved' ? 'resolved' : 'betting';
}

function stakeChipsMarkup(input: DockInput): string {
  const maxValue = Math.min(input.chips, input.maxStake);
  const selected = input.selectedStake;
  const chip = (value: number | 'max', label: string, disabled: boolean): string => {
    const amount = value === 'max' ? maxValue : value;
    const isSelected = selected === amount;
    const bounce = input.fx?.has(`stake:${value}`) ? ' is-bounce' : '';
    return `<button type="button" class="stake-button dock-chip${isSelected ? ' is-selected' : ''}${bounce}" data-stake="${value}" aria-pressed="${isSelected}" aria-label="Stake ${label}${value === 'max' ? ` (${input.formatChips(maxValue)})` : ''} chips"${disabled ? ' disabled' : ''}>${label}</button>`;
  };
  return `
    <div class="dock-stakes" role="group" aria-label="Choose a fictional chip stake">
      <span class="dock-readout"><small>STAKE</small><b>${input.formatChips(selected)}</b></span>
      ${input.stakeOptions.map((value) => chip(value, String(value), value > input.chips)).join('')}
      ${chip('max', 'MAX', false)}
    </div>`;
}

function actionButtonsMarkup(input: DockInput): string {
  return `
    <div class="dock-actions action-bar" aria-label="Blackjack actions">
      ${DOCK_ACTIONS.map((action) => {
        const enabled = input.allowed.includes(action);
        const fired = input.fx?.has(`action:${action}`) ? ' is-fired' : '';
        return `<button type="button" class="dock-action dock-action-${action}${enabled ? ' is-ready' : ''}${fired}" data-action="${action}" aria-label="${action.toUpperCase()}" aria-keyshortcuts="${ACTION_SHORTCUTS[action]}"${enabled ? '' : ' disabled'}><strong>${action.toUpperCase()}</strong><kbd aria-hidden="true">${ACTION_SHORTCUTS[action]}</kbd></button>`;
      }).join('')}
    </div>`;
}

export function tableDockMarkup(input: DockInput): string {
  const error = input.error ? `<p class="error-line dock-error" role="alert">${input.error}</p>` : '';
  const note = input.phase === 'broke'
    ? '<p class="dock-note">No purchase required · restores the fictional practice stack</p>'
    : `<p class="dock-note">${input.house ? 'Arcade rules · ' : ''}Fictional practice chips · no cash value</p>`;
  let body: string;

  if (input.phase === 'playing') {
    body = `
      <span class="dock-readout dock-wager"><small>${input.handLabel ?? 'IN PLAY'}</small><b>${input.wager ?? ''}</b></span>
      ${actionButtonsMarkup(input)}`;
  } else if (input.phase === 'broke') {
    body = `
      <span class="dock-readout"><small>CHIPS</small><b>0</b></span>
      <div class="dock-actions">
        <button type="button" class="primary-action dock-primary" data-action="refill">Refill practice chips</button>
      </div>`;
  } else {
    const replay = input.runItBack
      ? `<button type="button" class="house-special-action dock-secondary" data-action="run-it-back"><strong>Run It Back</strong><small>${input.runItBack.stake} · ${input.runItBack.tokens} token${input.runItBack.tokens === 1 ? '' : 's'}</small></button>`
      : '';
    body = `
      ${stakeChipsMarkup(input)}
      <div class="dock-actions">
        ${replay}
        <button type="button" class="primary-action deal-button dock-primary is-ready" data-action="deal" aria-keyshortcuts="N"><strong>${input.phase === 'resolved' ? 'Deal again' : 'Deal'}</strong><kbd aria-hidden="true">N</kbd></button>
      </div>`;
  }

  return `
    <section class="table-dock game-controls phase-${input.phase}${input.house ? ' house-controls' : ''}" aria-label="Table controls">
      ${error}
      <div class="dock-row">${body}</div>
      ${note}
    </section>`;
}
