import type { AppScreen } from '../types/app';
import { shouldIgnoreActivation } from './fx';
import { menuBoardMarkup } from './menu-board';

/*
 * In-game pause/table board. Opening it never touches the round: the table
 * stays mounted (inert) behind a hanging menu-bar.png sign. Only visual or
 * feedback options are offered inline; "Main Menu" asks for confirmation when
 * a hand is still in play.
 */

export const TABLE_SCREENS: readonly AppScreen[] = ['classic', 'house'];

export const isTableScreen = (screen: AppScreen): boolean => TABLE_SCREENS.includes(screen);

export type EscapeIntent = 'open-pause' | 'close-pause' | 'back' | 'none';

/** What Escape should do: toggle the pause board at a table, otherwise go back. */
export function escapeIntent(screen: AppScreen, pauseOpen: boolean): EscapeIntent {
  if (isTableScreen(screen)) return pauseOpen ? 'close-pause' : 'open-pause';
  return screen === 'menu' ? 'none' : 'back';
}

export type LeaveDecision = 'confirm' | 'leave' | 'ignore';

/**
 * What a "Main Menu" press on the pause board does. With a hand in play the
 * first press only arms "Leave hand?"; a pointer tap landing within the input
 * guard of arming is the same double-tap and is ignored, so it can't abandon
 * the hand without a deliberate second press.
 */
export function pauseLeaveDecision(input: {
  readonly handInProgress: boolean;
  readonly confirmArmed: boolean;
  readonly armedAt: number;
  readonly now: number;
  readonly pointer: boolean;
}): LeaveDecision {
  if (!input.handInProgress) return 'leave';
  if (!input.confirmArmed) return 'confirm';
  return shouldIgnoreActivation({ now: input.now, controlsChangedAt: input.armedAt, pointer: input.pointer }) ? 'ignore' : 'leave';
}

export interface PauseMenuInput {
  readonly modeLabel: string;
  readonly chips: string;
  readonly rep: number;
  readonly title: string;
  readonly handInProgress: boolean;
  readonly confirmLeave: boolean;
  readonly deckLabel: string;
  readonly soundOn: boolean;
}

export function pauseMenuMarkup(input: PauseMenuInput): string {
  const leave = input.confirmLeave
    ? { label: 'Leave hand?', detail: 'Tap again · no chips charged' }
    : { label: 'Main Menu', detail: input.handInProgress ? 'Hand in progress' : '' };

  return `
    <div class="pause-overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title" aria-describedby="pause-summary">
      <div class="pause-backdrop" data-pause-action="resume" aria-hidden="true"></div>
      <div class="pause-sign">
        <span class="pause-rope pause-rope-left" aria-hidden="true"></span>
        <span class="pause-rope pause-rope-right" aria-hidden="true"></span>
        ${menuBoardMarkup({
          as: 'div',
          className: 'pause-board',
          items: [
            {
              slot: 'header',
              html: `<h2 id="pause-title" class="pause-title">Table paused</h2>
                <p id="pause-summary" class="pause-summary">${input.modeLabel} · <b>${input.chips}</b> chips · <b>${input.rep.toLocaleString('en-US')}</b> REP · ${input.title}</p>`,
            },
            { slot: 'row1', label: 'Resume', detail: 'Esc', attributes: 'data-pause-action="resume" aria-keyshortcuts="Escape"' },
            { slot: 'row2', label: `Deck: ${input.deckLabel}`, detail: 'Change', attributes: 'data-pause-action="deck"' },
            { slot: 'row3', label: 'Sound', detail: input.soundOn ? 'On' : 'Off', attributes: `data-pause-action="sound" aria-pressed="${input.soundOn}"` },
            { slot: 'row4', label: leave.label, detail: leave.detail, attributes: `data-pause-action="menu"${input.confirmLeave ? ' data-confirm="true"' : ''}` },
          ],
        })}
      </div>
    </div>`;
}
