import { assetUrl } from '../assets/blackjak-assets';
import { dialoguePanelStyleVars } from '../config/dialogue-panel-layout';
import { DIALOGUE_BAR_LAYOUT } from '../data/visual-atlas';
import { atlasSpriteMarkup } from './atlas';

/*
 * DialogueStatusPanel — the wooden dialogue-status-bar.png frame around Jak's
 * line, the dealer context, and one compact status/result line.
 *
 * The art is decorative (border-image + aria-hidden wood). Every word is
 * semantic HTML. Exactly one live region exists (the status line), so a round
 * result and its REP tags are announced once; Jak's commentary is readable
 * but not live, matching the previous behaviour. Nothing here waits or blocks.
 */

export type PanelTone = 'idle' | 'playing' | 'blackjack' | 'win' | 'loss' | 'push' | 'mixed';

export interface PanelStatus {
  readonly tone: PanelTone;
  /** Short emphasised lead, e.g. "PAID" / "BUSTED". */
  readonly title?: string;
  readonly text: string;
  /** Small extra notes, e.g. "+50 REP", "RUN IT BACK TOKEN EARNED". */
  readonly tags?: readonly string[];
}

export interface DialoguePanelInput {
  readonly speaker: string;
  readonly context: string;
  readonly line: string;
  /** Dialogue event id, used only for styling hooks. */
  readonly event?: string;
  readonly status: PanelStatus;
  readonly house?: boolean;
}

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function dialoguePanelMarkup(input: DialoguePanelInput): string {
  const { status } = input;
  const tags = (status.tags ?? []).filter(Boolean);

  return `
    <section class="dialogue-panel tone-${status.tone}${input.house ? ' is-house' : ''}" style="${dialoguePanelStyleVars(assetUrl('dialogueBar'))}" aria-label="Jak and table status">
      <div class="dialogue-panel-wood" aria-hidden="true">${atlasSpriteMarkup('dialogueBar', DIALOGUE_BAR_LAYOUT.content.rect, { fit: 'cover' })}</div>
      <p class="dialogue-panel-speaker"><b>${escapeHtml(input.speaker)}</b><span>${escapeHtml(input.context)}</span></p>
      <p class="dialogue-panel-line"${input.event ? ` data-event="${escapeHtml(input.event)}"` : ''}><span class="dialogue-panel-quote" aria-hidden="true">“</span>${escapeHtml(input.line)}</p>
      <p class="dialogue-panel-status" role="status" aria-live="polite" aria-atomic="true">${status.title ? `<strong>${escapeHtml(status.title)}</strong> ` : ''}<span>${escapeHtml(status.text)}</span>${tags.map((tag) => ` <em class="dialogue-panel-tag">${escapeHtml(tag)}</em>`).join('')}</p>
    </section>`;
}
