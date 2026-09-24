import {
  DEALER_ACTION_MS,
  DEALER_WINDOW,
  dealerPoseFrame,
  dealerVisualFor,
  type DealerAction,
} from '../data/dealer-visuals';
import { DEALER_SPRITES, type DealerSpriteId } from '../data/visual-atlas';
import type { DialogueEvent } from '../game';
import { atlasSpriteMarkup } from './atlas';

/*
 * Jak NPC renderer. The sprite is purely decorative (aria-hidden); the
 * accessible dialogue text lives in the scene's dialogue layer. Poses are
 * derived from the dialogue event on screen plus an optional one-shot action
 * cue, never from blackjack rules.
 */

export interface DealerRenderInput {
  readonly event: DialogueEvent;
  /** Dialogue line text; picks between a mood's alternative poses. */
  readonly seed: string;
  /** One-shot gesture to play before settling (consumed by the caller after rendering). */
  readonly action: DealerAction | null;
  readonly house: boolean;
}

let lastPose: DealerSpriteId | null = null;

function poseMarkup(id: DealerSpriteId, role: 'mood' | 'action'): string {
  const frame = dealerPoseFrame(id);
  return `<div class="dealer-pose dealer-pose-${role}" data-pose="${id}" style="--pose-w:${frame.width.toFixed(2)}%;--pose-x:${frame.left.toFixed(2)}%;--pose-y:${frame.top.toFixed(2)}%">${atlasSpriteMarkup('dealer', DEALER_SPRITES[id].rect)}</div>`;
}

export function dealerMarkup(input: DealerRenderInput): string {
  const visual = dealerVisualFor(input.event, input.seed, input.action);
  const poseChanged = lastPose !== null && lastPose !== visual.pose;
  lastPose = visual.pose;

  const classes = [
    'dealer-npc',
    `mood-${visual.mood}`,
    visual.actionPose ? `is-acting action-${visual.action}` : '',
    !visual.actionPose && poseChanged ? 'is-new-pose' : '',
    input.house ? 'is-house' : '',
  ].filter(Boolean).join(' ');

  const style = [
    `--dealer-window-aspect:${DEALER_WINDOW.aspect}`,
    visual.action ? `--dealer-action-ms:${DEALER_ACTION_MS[visual.action]}ms` : '',
  ].filter(Boolean).join(';');

  return `
    <div class="${classes}" data-dealer-mood="${visual.mood}" data-dealer-pose="${visual.pose}" style="${style}">
      <div class="dealer-window" aria-hidden="true">
        ${visual.actionPose ? poseMarkup(visual.actionPose, 'action') : ''}
        ${poseMarkup(visual.pose, 'mood')}
      </div>
    </div>`;
}

/** Test helper: forget the previously rendered pose. */
export function resetDealerPoseMemory(): void {
  lastPose = null;
}
